import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs';

import { Modal } from '../../../../../shared/ui/modal/modal';
import { AlertaGlobalService } from '../../../../../core/notificaciones/alerta-global.service';
import { ContenidoApiService } from '../../contenido/contenido-api.service';
import { LeccionRespuesta } from '../../contenido/contenido.model';

interface DatosReprogramacion {
  inicio: string;
  fin: string;
  motivo: string;
}

/** HU-027 — Reprogramar una sesión en vivo futura. Si la nueva fecha supera el fin del curso, el
 * backend no guarda nada y devuelve `requiereAmpliarFinDeCurso`: se le pide al admin confirmar la
 * nueva fecha de fin del curso sin perder lo que ya escribió, y se reintenta automáticamente. */
@Component({
  selector: 'app-modal-reprogramar-sesion',
  imports: [Modal],
  templateUrl: './modal-reprogramar.html',
  styleUrl: './modal-reprogramar.scss',
})
export class ModalReprogramarSesion implements OnInit {
  @Input({ required: true }) leccion!: LeccionRespuesta;
  @Input({ required: true }) cursoId!: number;
  @Output() cerrado = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  private readonly api = inject(ContenidoApiService);
  private readonly alertasGlobales = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nuevaFechaInicio = signal('');
  protected readonly nuevaFechaFin = signal('');
  protected readonly motivo = signal('');
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  // Se completa solo cuando el backend responde requiereAmpliarFinDeCurso = true.
  protected readonly fechaFinCursoSugerida = signal<string | null>(null);
  protected readonly nuevaFechaFinCurso = signal('');
  private datosPendientes: DatosReprogramacion | null = null;

  ngOnInit(): void {
    this.nuevaFechaInicio.set(this.aDatetimeLocal(this.leccion.fechaHoraInicio) ?? '');
    this.nuevaFechaFin.set(this.aDatetimeLocal(this.leccion.fechaHoraFin) ?? '');
  }

  protected volverAEditarSesion(): void {
    this.fechaFinCursoSugerida.set(null);
    this.nuevaFechaFinCurso.set('');
    this.datosPendientes = null;
  }

  protected guardar(): void {
    if (this.guardando()) {
      return;
    }
    const inicio = this.aInstante(this.nuevaFechaInicio() || null);
    const fin = this.aInstante(this.nuevaFechaFin() || null);
    const motivo = this.motivo().trim();
    if (!inicio || !fin) {
      this.error.set('Ingresa la nueva fecha de inicio y fin.');
      return;
    }
    if (new Date(fin).getTime() <= new Date(inicio).getTime()) {
      this.error.set('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    if (!motivo) {
      this.error.set('Ingresa el motivo de la reprogramación.');
      return;
    }
    this.error.set(null);
    this.enviarReprogramacion({ inicio, fin, motivo });
  }

  private enviarReprogramacion(datos: DatosReprogramacion): void {
    this.guardando.set(true);
    this.api
      .reprogramarSesion(this.leccion.id, {
        nuevaFechaHoraInicio: datos.inicio,
        nuevaFechaHoraFin: datos.fin,
        motivo: datos.motivo,
      })
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.aplicado && respuesta.requiereAmpliarFinDeCurso) {
            this.datosPendientes = datos;
            this.fechaFinCursoSugerida.set(respuesta.fechaFinCursoSugerida);
            this.nuevaFechaFinCurso.set(respuesta.fechaFinCursoSugerida ?? '');
            return;
          }
          this.alertasGlobales.mostrar('exito', 'Sesión reprogramada.');
          this.guardado.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.mensajeError(error) ?? 'No pudimos reprogramar la sesión.');
        },
      });
  }

  protected confirmarAmpliarFinDeCurso(): void {
    const nuevaFechaFin = this.nuevaFechaFinCurso().trim();
    const pendiente = this.datosPendientes;
    if (!nuevaFechaFin || !pendiente || this.guardando()) {
      return;
    }
    this.error.set(null);
    this.guardando.set(true);
    this.api
      .ampliarFinDeCurso(this.cursoId, nuevaFechaFin)
      .pipe(
        switchMap(() =>
          this.api.reprogramarSesion(this.leccion.id, {
            nuevaFechaHoraInicio: pendiente.inicio,
            nuevaFechaHoraFin: pendiente.fin,
            motivo: pendiente.motivo,
          }),
        ),
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.alertasGlobales.mostrar('exito', 'Sesión reprogramada y fin de curso ampliado.');
          this.guardado.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.mensajeError(error) ?? 'No pudimos ampliar la fecha de fin del curso.');
        },
      });
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }

  private aInstante(valor: string | null): string | null {
    if (!valor) {
      return null;
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
  }

  private aDatetimeLocal(valor: string | null): string | null {
    if (!valor) {
      return null;
    }
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return null;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
  }
}
