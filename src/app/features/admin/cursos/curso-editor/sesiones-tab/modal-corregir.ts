import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, forkJoin } from 'rxjs';

import { Modal } from '../../../../../shared/ui/modal/modal';
import { AlertaGlobalService } from '../../../../../core/notificaciones/alerta-global.service';
import { ContenidoApiService } from '../../contenido/contenido-api.service';
import { EstadoAsistencia, HistorialSesionRespuesta, LeccionRespuesta } from '../../contenido/contenido.model';

interface FilaAsistencia {
  asistenciaId: number;
  matriculaId: number;
  alumnoNombre: string;
  estadoOriginal: EstadoAsistencia;
  estadoNuevo: EstadoAsistencia;
  motivo: string;
}

/** HU-027 — Corregir una sesión ya realizada: enlace de la grabación, asistencia alumno por
 * alumno (con motivo obligatorio solo para las filas que cambiaron) y el historial de cambios
 * de la sesión (solo lectura). */
@Component({
  selector: 'app-modal-corregir-sesion',
  imports: [Modal],
  templateUrl: './modal-corregir.html',
  styleUrl: './modal-corregir.scss',
})
export class ModalCorregirSesion implements OnInit {
  @Input({ required: true }) leccion!: LeccionRespuesta;
  @Output() cerrado = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  private readonly api = inject(ContenidoApiService);
  private readonly alertasGlobales = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly enlace = signal('');
  protected readonly cargando = signal(false);
  protected readonly cargado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly asistencias = signal<FilaAsistencia[]>([]);
  protected readonly historial = signal<HistorialSesionRespuesta[]>([]);

  protected readonly estadosAsistencia: EstadoAsistencia[] = ['PRESENTE', 'AUSENTE', 'JUSTIFICADA'];

  ngOnInit(): void {
    this.enlace.set(this.leccion.enlaceReunion ?? '');
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      asistencias: this.api.listarAsistenciasSesion(this.leccion.id),
      historial: this.api.historialSesion(this.leccion.id),
    })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ asistencias, historial }) => {
          this.asistencias.set(
            asistencias.map((a) => ({
              asistenciaId: a.asistenciaId,
              matriculaId: a.matriculaId,
              alumnoNombre: a.alumnoNombre,
              estadoOriginal: a.estado,
              estadoNuevo: a.estado,
              motivo: '',
            })),
          );
          this.historial.set(historial);
          this.cargado.set(true);
        },
        error: () => this.error.set('No pudimos cargar la información de la sesión.'),
      });
  }

  protected cambiarEstadoFila(asistenciaId: number, estado: string): void {
    this.asistencias.update((lista) =>
      lista.map((f) => (f.asistenciaId === asistenciaId ? { ...f, estadoNuevo: estado as EstadoAsistencia } : f)),
    );
  }

  protected cambiarMotivoFila(asistenciaId: number, motivo: string): void {
    this.asistencias.update((lista) => lista.map((f) => (f.asistenciaId === asistenciaId ? { ...f, motivo } : f)));
  }

  protected etiquetaAccionHistorial(accion: string): string {
    return accion === 'REPROGRAMACION' ? 'Reprogramación' : 'Cancelación';
  }

  protected formatearFecha(valor: string | null): string {
    if (!valor) {
      return '—';
    }
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return '—';
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
  }

  protected guardar(): void {
    if (this.guardando()) {
      return;
    }
    const enlaceTexto = this.textoOpcional(this.enlace());
    const enlaceCambio = enlaceTexto !== (this.leccion.enlaceReunion ?? null);
    const filasCambiadas = this.asistencias().filter((f) => f.estadoNuevo !== f.estadoOriginal);

    if (enlaceCambio && !enlaceTexto) {
      this.error.set('Ingresa el enlace de la reunión.');
      return;
    }
    if (filasCambiadas.some((f) => !f.motivo.trim())) {
      this.error.set('Ingresa el motivo de la corrección para cada asistencia que cambiaste.');
      return;
    }
    if (!enlaceCambio && filasCambiadas.length === 0) {
      this.error.set('No realizaste ningún cambio.');
      return;
    }

    this.error.set(null);
    const llamadas: Observable<unknown>[] = [];
    if (enlaceCambio && enlaceTexto) {
      llamadas.push(this.api.corregirEnlaceSesion(this.leccion.id, { enlaceReunion: enlaceTexto }));
    }
    for (const fila of filasCambiadas) {
      llamadas.push(
        this.api.corregirAsistencia(fila.asistenciaId, { nuevoEstado: fila.estadoNuevo, motivoCorreccion: fila.motivo.trim() }),
      );
    }

    this.guardando.set(true);
    forkJoin(llamadas)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.alertasGlobales.mostrar('exito', 'Sesión corregida.');
          this.guardado.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.mensajeError(error) ?? 'No pudimos guardar los cambios.');
        },
      });
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }

  private textoOpcional(valor: string): string | null {
    const limpio = valor.trim();
    return limpio.length > 0 ? limpio : null;
  }
}
