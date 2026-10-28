import { DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { AvanceCertificadoBloque } from '../../../aula/avance-certificado/avance-certificado';
import { AvanceCertificado } from '../../../aula/aula.model';
import { formatearFechaHoraCorta } from '../../../cursos/curso-formato.util';
import { SeguimientoAcademicoApiService } from './seguimiento-academico-api.service';
import {
  ExamenSeguimiento,
  SeguimientoAcademicoDetalle,
  SesionSeguimiento,
} from './seguimiento-academico.model';

type Pestana = 'lecciones' | 'examenes' | 'asistencia' | 'historial';

const MOTIVO_MINIMO = 10;

/**
 * HU-031 — Seguimiento académico de un alumno en un curso (administración): vista de solo lectura
 * que explica por qué no finaliza y dos acciones justificadas: corregir la asistencia de una sesión
 * y conceder UN intento adicional. Nada borra ni sobrescribe el historial: el intento fallido se
 * conserva y cada corrección guarda el valor anterior, el motivo, el responsable y la fecha.
 */
@Component({
  selector: 'app-seguimiento-academico',
  imports: [DatePipe, DecimalPipe, LowerCasePipe, FormsModule, RouterLink, Modal, AvanceCertificadoBloque],
  templateUrl: './seguimiento-academico.html',
  styleUrl: './seguimiento-academico.scss',
})
export class SeguimientoAcademico {
  private readonly api = inject(SeguimientoAcademicoApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatearFechaHoraCorta = formatearFechaHoraCorta;
  protected readonly detalle = signal<SeguimientoAcademicoDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pestana = signal<Pestana>('lecciones');

  // Acción en curso (modal): intento adicional o corrección de asistencia.
  protected readonly examenAConceder = signal<ExamenSeguimiento | null>(null);
  protected readonly sesionACorregir = signal<SesionSeguimiento | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorModal = signal<string | null>(null);
  protected motivo = '';
  protected nuevoEstado = 'PRESENTE';

  private matriculaId = 0;

  protected readonly avance = computed<AvanceCertificado | null>(() => {
    const d = this.detalle();
    return d ? { condiciones: d.condiciones, cumpleTodo: d.cumpleRequisitos, fraseAccionable: d.situacion } : null;
  });

  protected readonly pestanas = computed<{ id: Pestana; etiqueta: string }[]>(() => {
    const d = this.detalle();
    const lista: { id: Pestana; etiqueta: string }[] = [
      { id: 'lecciones', etiqueta: 'Lecciones' },
      { id: 'examenes', etiqueta: `Exámenes (${d?.examenes.length ?? 0})` },
    ];
    if (d && d.modalidad !== 'VIRTUAL') lista.push({ id: 'asistencia', etiqueta: 'Asistencia' });
    lista.push({ id: 'historial', etiqueta: `Excepciones (${d?.excepciones.length ?? 0})` });
    return lista;
  });

  protected readonly motivoValido = computed(() => this.motivoTexto().trim().length >= MOTIVO_MINIMO);
  private readonly motivoTexto = signal('');

  constructor() {
    this.ruta.paramMap
      .pipe(
        map((p) => Number(p.get('matriculaId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.matriculaId = id;
        this.cargar();
      });
  }

  protected cargar(): void {
    this.cargando.set(this.detalle() === null);
    this.error.set(null);
    this.api
      .consultar(this.matriculaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.detalle.set(d);
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.error.set(this.mensaje(e) ?? 'No pudimos cargar el seguimiento del alumno.');
          this.cargando.set(false);
        },
      });
  }

  // ------------------------------------------------------------------- modales --

  protected abrirIntento(examen: ExamenSeguimiento): void {
    this.errorModal.set(null);
    this.escribirMotivo('');
    this.examenAConceder.set(examen);
  }

  protected abrirCorreccion(sesion: SesionSeguimiento): void {
    this.errorModal.set(null);
    this.escribirMotivo('');
    this.nuevoEstado = sesion.asistencia === 'PRESENTE' ? 'AUSENTE' : 'PRESENTE';
    this.sesionACorregir.set(sesion);
  }

  protected cerrarModal(): void {
    if (this.guardando()) return;
    this.examenAConceder.set(null);
    this.sesionACorregir.set(null);
  }

  protected escribirMotivo(valor: string): void {
    this.motivo = valor;
    this.motivoTexto.set(valor);
  }

  protected confirmarIntento(): void {
    const examen = this.examenAConceder();
    if (!examen || !this.motivoValido() || this.guardando()) return;
    this.guardando.set(true);
    this.api
      .otorgarIntento(this.matriculaId, examen.id, this.motivo.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.terminarAccion('Intento adicional concedido.'),
        error: (e: HttpErrorResponse) => this.fallarAccion(e, 'No pudimos conceder el intento.'),
      });
  }

  protected confirmarCorreccion(): void {
    const sesion = this.sesionACorregir();
    if (!sesion?.asistenciaId || !this.motivoValido() || this.guardando()) return;
    this.guardando.set(true);
    this.api
      .corregirAsistencia(this.matriculaId, sesion.asistenciaId, this.nuevoEstado, this.motivo.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.terminarAccion('Asistencia corregida.'),
        error: (e: HttpErrorResponse) => this.fallarAccion(e, 'No pudimos corregir la asistencia.'),
      });
  }

  private terminarAccion(mensaje: string): void {
    this.guardando.set(false);
    this.examenAConceder.set(null);
    this.sesionACorregir.set(null);
    this.alertas.mostrar('exito', mensaje);
    this.cargar();
  }

  private fallarAccion(e: HttpErrorResponse, porDefecto: string): void {
    this.guardando.set(false);
    this.errorModal.set(this.mensaje(e) ?? porDefecto);
  }

  // ------------------------------------------------------------- presentación --

  protected etiquetaModalidad(m: string): string {
    return m === 'HIBRIDO' ? 'Híbrido' : m === 'EN_VIVO' ? 'En vivo' : 'Virtual';
  }

  protected etiquetaEstadoMatricula(estado: string): string {
    switch (estado) {
      case 'ACTIVA': return 'Activa';
      case 'FINALIZADA': return 'Finalizada';
      case 'VENCIDA': return 'Vencida';
      case 'CANCELADA': return 'Cancelada';
      default: return estado;
    }
  }

  protected claseLeccion(estado: string): string {
    switch (estado) {
      case 'COMPLETADA': return 'badge--disp-inmediato';
      case 'BLOQUEADA': return 'badge--disp-cerrado';
      case 'CANCELADA': return 'badge--disp-cancelado';
      default: return 'badge--disp-proximo';
    }
  }

  protected etiquetaLeccion(estado: string): string {
    switch (estado) {
      case 'COMPLETADA': return 'Completada';
      case 'BLOQUEADA': return 'Bloqueada';
      case 'CANCELADA': return 'Cancelada';
      default: return 'Pendiente';
    }
  }

  protected etiquetaForma(forma: string | null): string {
    switch (forma) {
      case 'VIDEO': return 'Por video';
      case 'MANUAL': return 'Manual';
      case 'ASISTENCIA': return 'Por asistencia';
      default: return '';
    }
  }

  protected claseExamen(estado: string): string {
    switch (estado) {
      case 'APROBADO': return 'badge--disp-inmediato';
      case 'NO_APROBADO': return 'badge--disp-cancelado';
      case 'PENDIENTE': return 'badge--disp-cerrado';
      default: return 'badge--disp-proximo';
    }
  }

  protected etiquetaExamen(estado: string): string {
    switch (estado) {
      case 'APROBADO': return 'Aprobado';
      case 'NO_APROBADO': return 'No aprobado';
      case 'EN_REVISION': return 'En revisión';
      case 'EN_CURSO': return 'Intento en curso';
      default: return 'Sin intentos';
    }
  }

  protected claseAsistencia(estado: string): string {
    switch (estado) {
      case 'PRESENTE': return 'badge--disp-inmediato';
      case 'AUSENTE': return 'badge--disp-cancelado';
      case 'JUSTIFICADA': return 'badge--disp-proximo';
      default: return 'badge--disp-cerrado';
    }
  }

  protected etiquetaAsistencia(estado: string): string {
    switch (estado) {
      case 'PRESENTE': return 'Presente';
      case 'AUSENTE': return 'Ausente';
      case 'JUSTIFICADA': return 'Justificada';
      case 'PENDIENTE': return 'Pendiente';
      default: return 'Sin registro';
    }
  }

  protected claseIntento(i: { estado: string; aprobado: boolean | null }): string {
    if (i.estado === 'PENDIENTE_REVISION' || i.estado === 'EN_PROGRESO') return 'badge--disp-proximo';
    return i.aprobado ? 'badge--disp-inmediato' : 'badge--disp-cancelado';
  }

  protected etiquetaIntento(i: { estado: string; aprobado: boolean | null }): string {
    if (i.estado === 'PENDIENTE_REVISION') return 'En revisión';
    if (i.estado === 'EN_PROGRESO') return 'En curso';
    return i.aprobado ? 'Aprobado' : 'No aprobado';
  }

  protected etiquetaExcepcion(tipo: string): string {
    return tipo === 'REABRIR_INTENTO' ? 'Intento adicional'
      : tipo === 'CORREGIR_ASISTENCIA' ? 'Corrección de asistencia' : tipo;
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }
}
