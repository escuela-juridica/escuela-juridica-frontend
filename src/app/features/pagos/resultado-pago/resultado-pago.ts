import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { formatearPrecio } from '../../cursos/curso-formato.util';
import { ConstanciaPagoVista } from '../constancia-pago/constancia-pago';
import { InstruccionesQr } from '../instrucciones-qr/instrucciones-qr';
import { ConstanciaPago, PagoDetalle } from '../pago.model';
import { PagosApiService } from '../pagos-api.service';

const INTERVALO_CONSULTA_MS = 4000;
const MAXIMO_CONSULTAS = 150;

/**
 * HU-047 — PF-018: resultado del pago. Solo un pago APROBADO muestra constancia; PENDIENTE, RECHAZADO, ERROR y
 * EXPIRADO explican su resultado sin afirmar que se realizó un pago. Mientras sigue PENDIENTE se consulta cada pocos
 * segundos porque Culqi puede tardar en comunicar el resultado.
 */
@Component({
  selector: 'app-resultado-pago',
  imports: [RouterLink, ConstanciaPagoVista, InstruccionesQr],
  templateUrl: './resultado-pago.html',
  styleUrl: './resultado-pago.scss',
})
export class ResultadoPago implements OnDestroy {
  private readonly api = inject(PagosApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly numeroPedido = inject(ActivatedRoute).snapshot.paramMap.get('numeroPedido') ?? '';

  protected readonly formatearPrecio = formatearPrecio;
  protected readonly pago = signal<PagoDetalle | null>(null);
  protected readonly constancia = signal<ConstanciaPago | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly ocupado = signal(false);

  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private consultas = 0;

  constructor() {
    this.consultar();
  }

  ngOnDestroy(): void {
    this.detenerConsulta();
  }

  protected reenviarAviso(): void {
    this.ocupado.set(true);
    this.api
      .reenviarAviso(this.numeroPedido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.ocupado.set(false);
          this.pago.set(p);
          this.alertas.mostrar(p.estadoCorreo === 'ENVIADO' ? 'exito' : 'error',
            p.estadoCorreo === 'ENVIADO' ? 'Reenviamos el aviso a tu correo.' : 'No pudimos enviar el correo. Inténtalo nuevamente.');
        },
        error: (e: HttpErrorResponse) => {
          this.ocupado.set(false);
          this.alertas.mostrar('error', this.mensaje(e) ?? 'No pudimos reenviar el aviso.');
        },
      });
  }

  protected imprimir(): void {
    window.print();
  }

  private consultar(): void {
    this.api
      .detalle(this.numeroPedido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.cargando.set(false);
          this.aplicar(p);
          if (p.estado === 'PENDIENTE' && ++this.consultas < MAXIMO_CONSULTAS) {
            this.temporizador = setTimeout(() => this.consultar(), INTERVALO_CONSULTA_MS);
          }
        },
        error: (e: HttpErrorResponse) => {
          this.cargando.set(false);
          this.error.set(e.status === 404 ? 'No encontramos este pago.' : 'No pudimos consultar tu pago. Inténtalo nuevamente.');
        },
      });
  }

  private aplicar(p: PagoDetalle): void {
    this.pago.set(p);
    if (p.estado !== 'PENDIENTE') this.detenerConsulta();
    if (p.estado === 'APROBADO' && !this.constancia()) {
      this.api.constancia(this.numeroPedido).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (c) => this.constancia.set(c),
        error: () => undefined,
      });
    }
  }

  private detenerConsulta(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }
}
