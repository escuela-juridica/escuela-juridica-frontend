import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap, tap } from 'rxjs';

import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { CursoApiService } from '../../cursos/curso-api.service';
import { etiquetaModalidad, formatearPrecio, mediosDePago } from '../../cursos/curso-formato.util';
import { FichaCursoDetalle } from '../../cursos/curso.model';
import { CulqiCheckoutService } from '../culqi-checkout.service';
import { InstruccionesQr } from '../instrucciones-qr/instrucciones-qr';
import { InstruccionesPago, PagoCheckout, PagoDetalle, PagosCurso } from '../pago.model';
import { PagosApiService } from '../pagos-api.service';

/**
 * HU-047 — PF-017: confirmación de compra. El alumno ve el precio vigente, lo confirma y recién entonces se inicia
 * la operación con Culqi. Mientras Culqi no apruebe, no hay acceso ni cupo reservado.
 */
@Component({
  selector: 'app-checkout-pago',
  imports: [RouterLink, InstruccionesQr],
  templateUrl: './checkout-pago.html',
  styleUrl: './checkout-pago.scss',
})
export class CheckoutPago {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cursos = inject(CursoApiService);
  private readonly pagos = inject(PagosApiService);
  private readonly culqi = inject(CulqiCheckoutService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatearPrecio = formatearPrecio;
  protected readonly etiquetaModalidad = etiquetaModalidad;

  protected readonly ficha = signal<FichaCursoDetalle | null>(null);
  protected readonly intentos = signal<PagosCurso | null>(null);
  protected readonly estado = signal<'cargando' | 'listo' | 'error'>('cargando');
  protected readonly mensajeError = signal('');
  protected readonly confirmado = signal(false);
  protected readonly procesando = signal(false);
  protected readonly errorPago = signal<string | null>(null);
  /** QR de una orden de billetera ya generada y aún pendiente: Culqi no deja volver a generarlo. */
  protected readonly instruccionesPendientes = signal<InstruccionesPago | null>(null);

  protected readonly medios = computed(() => {
    const f = this.ficha();
    return f ? mediosDePago(f.estadoComercial.precioActual) : [];
  });

  /** Hay un intento en proceso que se reanuda en lugar de crear otro. */
  protected readonly enProceso = computed(() => this.intentos()?.pendiente ?? null);
  protected readonly anteriores = computed<PagoDetalle[]>(() =>
    (this.intentos()?.intentos ?? []).filter((i) => i.estado !== 'PENDIENTE').slice(0, 3));
  protected readonly puedePagar = computed(() => {
    const f = this.ficha();
    return !!f && (f.estadoComercial.matriculaPermitida || this.enProceso() !== null);
  });

  constructor() {
    this.ruta.paramMap
      .pipe(
        tap(() => this.estado.set('cargando')),
        switchMap((p) => this.cursos.detalle(p.get('urlAmigable') ?? '')),
        tap((f) => this.ficha.set(f)),
        switchMap((f) => this.pagos.intentos(f.cursoId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (intentos) => {
          const f = this.ficha();
          if (intentos.estadoMatricula === 'ACTIVA' || f?.estadoComercial.accion === 'ACCESS_FREE') {
            void this.router.navigate(['/app/panel']);
            return;
          }
          this.intentos.set(intentos);
          this.estado.set('listo');
          if (intentos.pendiente) {
            this.pagos.detalle(intentos.pendiente).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: (d) => this.instruccionesPendientes.set(d.instrucciones),
              error: () => undefined,
            });
          }
        },
        error: (e: HttpErrorResponse) => {
          this.mensajeError.set(e.status === 404 ? 'No encontramos este curso.' : 'No pudimos preparar tu compra. Inténtalo nuevamente.');
          this.estado.set('error');
        },
      });
  }

  protected alternarConfirmacion(evento: Event): void {
    this.confirmado.set((evento.target as HTMLInputElement).checked);
  }

  protected pagar(): void {
    const f = this.ficha();
    if (!f || this.procesando() || (!this.confirmado() && !this.enProceso())) return;
    this.errorPago.set(null);
    this.procesando.set(true);
    this.pagos
      .iniciar(f.cursoId, f.estadoComercial.precioActual)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (checkout) => {
          this.procesando.set(false);
          this.abrirCheckout(checkout);
        },
        error: (e: HttpErrorResponse) => {
          this.procesando.set(false);
          const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { code?: string; message?: string }) : null;
          this.errorPago.set(cuerpo?.message ?? 'No pudimos iniciar el pago. Inténtalo nuevamente.');
          if (cuerpo?.code === 'PRICE_CHANGED') {
            // El precio cambió: se muestra el vigente y se exige confirmarlo otra vez.
            this.confirmado.set(false);
            this.recargarFicha(f.urlAmigable);
          }
        },
      });
  }

  private abrirCheckout(checkout: PagoCheckout): void {
    this.culqi
      .abrir(checkout, {
        alCrearToken: (tokenId) => this.enviarToken(checkout.numeroPedido, tokenId),
        alCrearOrden: () => this.irAlResultado(checkout.numeroPedido),
        alFallar: (mensaje) => this.errorPago.set(mensaje),
      })
      .catch(() => this.errorPago.set('No pudimos abrir Culqi. Revisa tu conexión e inténtalo nuevamente.'));
  }

  private enviarToken(numeroPedido: string, tokenId: string): void {
    this.procesando.set(true);
    this.pagos
      .enviarToken(numeroPedido, tokenId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.irAlResultado(numeroPedido),
        error: () => {
          this.procesando.set(false);
          this.alertas.mostrar('error', 'No pudimos confirmar el resultado con Culqi. Revisa el estado de tu pago.');
          this.irAlResultado(numeroPedido);
        },
      });
  }

  private irAlResultado(numeroPedido: string): void {
    void this.router.navigate(['/app/pagos', numeroPedido]);
  }

  private recargarFicha(urlAmigable: string): void {
    this.cursos.detalle(urlAmigable).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (f) => this.ficha.set(f) });
  }
}
