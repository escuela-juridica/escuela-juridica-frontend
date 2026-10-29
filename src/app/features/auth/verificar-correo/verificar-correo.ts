import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { VerificarCorreoApiService } from './verificar-correo-api.service';

type EstadoPantalla = 'formulario' | 'verificando' | 'verificado';

interface ErrorApiVerificacion {
  code?: string;
  message?: string;
}

@Component({
  selector: 'app-verificar-correo',
  templateUrl: './verificar-correo.html',
  styleUrl: './verificar-correo.scss',
})
export class VerificarCorreo implements OnInit {
  private readonly api = inject(VerificarCorreoApiService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly correoConocido = signal<string | null>(null);
  protected readonly resolviendoContexto = signal(false);
  protected readonly correoManual = signal('');
  protected readonly codigo = signal('');
  protected readonly estado = signal<EstadoPantalla>('formulario');
  protected readonly errorCodigo = signal<string | null>(null);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly reenviando = signal(false);
  protected readonly mensajeReenvio = signal<string | null>(null);
  protected readonly requiereCambioContrasena = signal(false);

  protected readonly correoEfectivo = computed(
    () => this.correoConocido() ?? this.correoManual().trim(),
  );
  protected readonly correoOculto = computed(() => this.ocultarCorreo(this.correoEfectivo()));
  protected readonly puedeVerificar = computed(
    () =>
      this.codigo().length === 6 &&
      this.correoEfectivo().length > 0 &&
      this.estado() !== 'verificando',
  );

  ngOnInit(): void {
    const estadoNavegacion = history.state as { correo?: unknown; envioAceptado?: unknown } | null;
    const correo = estadoNavegacion?.correo;
    if (typeof correo === 'string' && correo.trim().length > 0) {
      this.correoConocido.set(correo.trim().toLowerCase());
    }
    if (estadoNavegacion?.envioAceptado === false) {
      this.mensajeReenvio.set(
        'No pudimos enviarte el código automáticamente al registrarte. Solicita un reenvío.',
      );
    }

    if (!this.correoConocido()) {
      const referencia = this.ruta.snapshot.queryParamMap.get('referencia');
      if (referencia) {
        this.resolverContexto(referencia);
      }
    }
  }

  private resolverContexto(referencia: string): void {
    this.resolviendoContexto.set(true);
    this.api
      .obtenerContexto(referencia)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((contexto) => {
        this.resolviendoContexto.set(false);
        if (contexto) {
          this.correoConocido.set(contexto.correo.toLowerCase());
        }
      });
  }

  protected onCodigoInput(valor: string): void {
    this.codigo.set(valor.replace(/\D/g, '').slice(0, 6));
    this.errorCodigo.set(null);
  }

  protected onCorreoManualInput(valor: string): void {
    this.correoManual.set(valor);
    this.errorCodigo.set(null);
  }

  protected verificar(): void {
    if (!this.puedeVerificar()) {
      return;
    }
    this.estado.set('verificando');
    this.errorCodigo.set(null);
    this.errorGeneral.set(null);

    this.api
      .verificar({ correo: this.correoEfectivo(), codigo: this.codigo() })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.manejarErrorVerificacion(error);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((respuesta) => {
        if (!respuesta) {
          this.estado.set('formulario');
          return;
        }
        this.requiereCambioContrasena.set(respuesta.requiereCambioContrasena);
        this.estado.set('verificado');
      });
  }

  protected reenviar(): void {
    if (this.correoEfectivo().length === 0 || this.reenviando()) {
      return;
    }
    this.reenviando.set(true);
    this.mensajeReenvio.set(null);
    this.errorGeneral.set(null);

    this.api
      .reenviar({ correo: this.correoEfectivo() })
      .pipe(
        catchError(() => {
          this.errorGeneral.set('No pudimos procesar el reenvío. Intenta nuevamente.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((respuesta) => {
        this.reenviando.set(false);
        this.codigo.set('');
        if (respuesta?.enviado) {
          this.mensajeReenvio.set('Te enviamos un nuevo código a tu correo.');
        } else if (respuesta) {
          this.mensajeReenvio.set(
            'No pudimos reenviar el código en este momento. Intenta nuevamente en unos minutos.',
          );
        }
      });
  }

  protected irAAcceso(): void {
    void this.router.navigate(['/acceso']);
  }

  private manejarErrorVerificacion(error: HttpErrorResponse): void {
    const cuerpo = this.obtenerErrorApi(error);
    if (cuerpo?.code === 'INVALID_CODE') {
      this.errorCodigo.set('El código no coincide. Verifica e intenta de nuevo.');
      return;
    }
    this.errorGeneral.set('No pudimos verificar tu correo. Revisa tu conexión e intenta de nuevo.');
  }

  private obtenerErrorApi(error: HttpErrorResponse): ErrorApiVerificacion | null {
    if (typeof error.error !== 'object' || error.error === null) {
      return null;
    }
    return error.error as ErrorApiVerificacion;
  }

  private ocultarCorreo(correo: string): string {
    const [local, dominio] = correo.split('@');
    if (!dominio || local.length === 0) {
      return correo;
    }
    const visibles = local.slice(0, Math.min(3, local.length));
    return `${visibles}***@${dominio}`;
  }
}
