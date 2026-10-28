import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { resolverUrlApi } from '../../../core/api/api.config';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../shared/ui/modal/modal';
import { AulaSesionService } from '../../aula/aula-sesion.service';
import { formatearFechaLarga } from '../../cursos/curso-formato.util';
import { CertificacionApiService } from '../certificacion-api.service';
import { Certificacion } from '../certificacion.model';

/**
 * HU-032 — "Tu certificado": dice en qué punto está el certificado del curso (faltan requisitos,
 * programado, faltan datos, listo para generar o ya emitido), muestra la nota y el nivel proyectados,
 * deja confirmar los nombres a imprimir y, cuando corresponde, generarlo o descargarlo. Todo lo que
 * decide (estado, fechas, nivel) viene del servidor.
 */
@Component({
  selector: 'app-certificacion-bloque',
  imports: [ReactiveFormsModule, DecimalPipe, Modal],
  templateUrl: './certificacion-bloque.html',
  styleUrl: './certificacion-bloque.scss',
})
export class CertificacionBloque {
  readonly cursoId = input.required<number>();

  private readonly api = inject(CertificacionApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly aula = inject(AulaSesionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatearFechaLarga = formatearFechaLarga;

  protected readonly cert = signal<Certificacion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editandoDatos = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorDatos = signal<string | null>(null);
  protected readonly confirmandoEmision = signal(false);
  protected readonly emitiendo = signal(false);
  protected readonly errorEmision = signal<string | null>(null);

  protected readonly formulario = new FormGroup({
    nombres: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    apellidoPaterno: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    apellidoMaterno: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
  });

  constructor() {
    // Se vuelve a consultar cada vez que cambia el avance del curso (lección, examen, nota publicada).
    effect(() => {
      const id = this.cursoId();
      this.aula.aula();
      untracked(() => this.cargar(id));
    });
  }

  private cargar(cursoId: number): void {
    this.api
      .consultar(cursoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => this.mostrar(c),
        error: (e: HttpErrorResponse) => {
          this.error.set(this.mensaje(e) ?? 'No pudimos consultar tu certificado.');
          this.cargando.set(false);
        },
      });
  }

  private mostrar(c: Certificacion): void {
    this.cert.set(c);
    this.cargando.set(false);
    this.error.set(null);
    if (!this.formulario.dirty) {
      this.formulario.reset({
        nombres: c.datos.nombres ?? '',
        apellidoPaterno: c.datos.apellidoPaterno ?? '',
        apellidoMaterno: c.datos.apellidoMaterno ?? '',
      });
    }
    // Si faltan datos, el formulario se muestra de entrada; si ya están confirmados, queda plegado.
    if (c.estado === 'PENDIENTE_DATOS') this.editandoDatos.set(true);
  }

  protected abrirDatos(): void {
    this.errorDatos.set(null);
    this.editandoDatos.set(true);
  }

  protected cancelarDatos(): void {
    const c = this.cert();
    if (c) {
      this.formulario.reset({
        nombres: c.datos.nombres ?? '',
        apellidoPaterno: c.datos.apellidoPaterno ?? '',
        apellidoMaterno: c.datos.apellidoMaterno ?? '',
      });
    }
    this.editandoDatos.set(false);
  }

  protected confirmarDatos(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (this.guardando()) return;
    this.guardando.set(true);
    this.errorDatos.set(null);
    this.api
      .confirmarDatos(this.cursoId(), this.formulario.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.guardando.set(false);
          this.formulario.markAsPristine();
          this.editandoDatos.set(false);
          this.mostrar(c);
          this.alertas.mostrar('exito', c.certificado ? 'Datos confirmados. Tu certificado fue emitido.' : 'Datos confirmados.');
        },
        error: (e: HttpErrorResponse) => {
          this.guardando.set(false);
          this.errorDatos.set(this.mensaje(e) ?? 'No pudimos guardar tus datos.');
        },
      });
  }

  protected pedirEmision(): void {
    this.errorEmision.set(null);
    this.confirmandoEmision.set(true);
  }

  protected cerrarEmision(): void {
    if (!this.emitiendo()) this.confirmandoEmision.set(false);
  }

  protected emitir(): void {
    if (this.emitiendo()) return;
    this.emitiendo.set(true);
    this.api
      .emitir(this.cursoId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.emitiendo.set(false);
          this.confirmandoEmision.set(false);
          this.mostrar(c);
          // Emitir cierra los intentos calificados: el estado de los exámenes del aula cambió.
          this.aula.refrescar();
          this.alertas.mostrar('exito', 'Tu certificado fue emitido.');
        },
        error: (e: HttpErrorResponse) => {
          this.emitiendo.set(false);
          this.errorEmision.set(this.mensaje(e) ?? 'No pudimos emitir tu certificado.');
        },
      });
  }

  protected descargar(): void {
    const url = this.cert()?.certificado?.descargaUrl;
    if (url) window.open(resolverUrlApi(url), '_blank');
  }

  protected etiquetaEstado(c: Certificacion): string {
    switch (c.estado) {
      case 'PENDIENTE_REQUISITOS': return 'Pendiente de requisitos';
      case 'PROGRAMADO': return c.emisionAutomatica ? 'Emisión programada' : 'Disponible pronto';
      case 'PENDIENTE_DATOS': return 'Faltan tus datos';
      case 'LISTO_PARA_EMITIR': return 'Listo para generar';
      case 'ANULADO': return 'Anulado';
      default: return 'Emitido';
    }
  }

  protected claseEstado(c: Certificacion): string {
    switch (c.estado) {
      case 'VIGENTE': return 'badge--disp-inmediato';
      case 'ANULADO': return 'badge--disp-cancelado';
      case 'PENDIENTE_REQUISITOS': return 'badge--disp-cerrado';
      default: return 'badge--disp-proximo';
    }
  }

  protected mostrarProyeccion(c: Certificacion): boolean {
    return c.fechaFinalizacion !== null && c.certificado === null;
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }
}
