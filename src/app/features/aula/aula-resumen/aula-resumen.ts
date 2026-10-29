import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { AnilloProgreso } from '../../../shared/ui/anillo-progreso/anillo-progreso';
import { formatearFechaHora } from '../../cursos/curso-formato.util';
import { SesionAlumnoApiService } from '../../sesiones/sesion-alumno-api.service';
import { CertificacionBloque } from '../../certificacion/certificacion-bloque/certificacion-bloque';
import { AvanceCertificadoBloque } from '../avance-certificado/avance-certificado';
import { AulaSesionService, LeccionDelCurso } from '../aula-sesion.service';
import { ExamenAulaRespuesta } from '../aula.model';

/** Un examen del curso con el módulo al que pertenece (o ninguno si es final). */
export interface ExamenDelCurso {
  examen: ExamenAulaRespuesta;
  modulo: string | null;
}

export type PestanaResumen = 'resumen' | 'evaluaciones' | 'certificado';

/** HU-022 / HU-025 — Resumen del curso: portada con el avance y el siguiente paso, y pestañas con lo
 * que sigue (sesiones y requisitos), las evaluaciones y el certificado. Es lo que se ve al entrar al
 * aula, antes de abrir una lección. */
@Component({
  selector: 'app-aula-resumen',
  imports: [RouterLink, AvanceCertificadoBloque, CertificacionBloque, AnilloProgreso],
  templateUrl: './aula-resumen.html',
  styleUrl: './aula-resumen.scss',
})
export class AulaResumen {
  protected readonly estado = inject(AulaSesionService);
  private readonly sesionApi = inject(SesionAlumnoApiService);
  private readonly alertas = inject(AlertaGlobalService);

  protected readonly ingresando = signal<number | null>(null);
  protected readonly pestana = signal<PestanaResumen>('resumen');
  protected readonly formatearFechaHora = formatearFechaHora;

  /** La lección donde seguir, solo si todavía hay algo por hacer en ella. */
  protected readonly continuar = computed<LeccionDelCurso | null>(() => {
    const destino = this.estado.leccionParaContinuar();
    return destino && destino.leccion.estado !== 'COMPLETADA' ? destino : null;
  });

  /** Primer motivo de bloqueo cuando no queda nada disponible (p. ej. un examen pendiente). */
  protected readonly bloqueo = computed(() => {
    if (this.continuar()) return null;
    return this.estado.lecciones().find((l) => l.leccion.estado === 'BLOQUEADA')?.leccion.motivoBloqueo ?? null;
  });

  /** Todos los exámenes del curso (de módulo y final), en el orden del temario. */
  protected readonly examenes = computed<ExamenDelCurso[]>(() => {
    const aula = this.estado.aula();
    if (!aula) return [];
    return [
      ...aula.modulos.flatMap((m) => m.examenes.map((examen) => ({ examen, modulo: m.titulo }))),
      ...aula.examenesFinales.map((examen) => ({ examen, modulo: null })),
    ];
  });

  /** El examen que frena el avance (calificado, de módulo y sin aprobar), para ofrecer rendirlo ya. */
  protected readonly examenBloqueante = computed(
    () => this.examenes().find((e) => e.examen.bloqueaSiguienteModulo && !e.examen.aprobado)?.examen ?? null,
  );

  /** Cifras del curso para la portada. */
  protected readonly cifras = computed(() => {
    const aula = this.estado.aula();
    const lecciones = this.estado.lecciones();
    return {
      modulos: aula?.modulos.length ?? 0,
      lecciones: lecciones.length,
      sesiones: lecciones.filter((l) => l.leccion.tipo === 'EN_VIVO').length,
      evaluaciones: this.examenes().length,
      horas: aula?.horasAcademicas ?? null,
    };
  });

  protected readonly examenesPendientes = computed(
    () => this.examenes().filter((e) => e.examen.estado !== 'APROBADO' && e.examen.tipo === 'CALIFICADO').length,
  );

  protected readonly terminoLecciones = computed(
    () => this.estado.lecciones().length > 0 && this.estado.totalCompletadas() === this.estado.lecciones().length,
  );

  protected readonly proximasSesiones = computed(() =>
    this.estado
      .lecciones()
      .filter((l) => l.leccion.tipo === 'EN_VIVO' && (l.leccion.estadoSesion === 'FUTURA' || l.leccion.estadoSesion === 'EN_VENTANA'))
      .filter((l) => l.leccion.fechaHoraInicio)
      .sort((a, b) => a.leccion.fechaHoraInicio!.localeCompare(b.leccion.fechaHoraInicio!))
      .slice(0, 4),
  );

  constructor() {
    this.estado.leccionActualId.set(null);
  }

  protected etiquetaModalidad(modalidad: string): string {
    return modalidad === 'EN_VIVO' ? 'En vivo' : modalidad === 'HIBRIDO' ? 'Híbrido' : 'Virtual';
  }

  protected diaDe(iso: string): string {
    return new Intl.DateTimeFormat('es-PE', { day: 'numeric', timeZone: 'America/Lima' }).format(new Date(iso));
  }

  protected mesDe(iso: string): string {
    return new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'America/Lima' }).format(new Date(iso)).replace('.', '');
  }

  protected claseTarjetaExamen(e: ExamenAulaRespuesta): string {
    switch (e.estado) {
      case 'APROBADO': return 'examen-tarjeta--exito';
      case 'NO_APROBADO': return 'examen-tarjeta--error';
      case 'EN_REVISION': return 'examen-tarjeta--revision';
      case 'EN_CURSO': return 'examen-tarjeta--curso';
      default: return e.habilitado ? 'examen-tarjeta--pendiente' : 'examen-tarjeta--bloqueado';
    }
  }

  protected etiquetaEstadoExamen(e: ExamenAulaRespuesta): string {
    switch (e.estado) {
      case 'APROBADO': return 'Aprobado';
      case 'EN_CURSO': return 'En curso';
      case 'EN_REVISION': return 'En revisión';
      case 'NO_APROBADO': return 'No aprobado';
      default: return e.habilitado ? 'Pendiente' : 'No disponible';
    }
  }

  protected claseEstadoExamen(e: ExamenAulaRespuesta): string {
    switch (e.estado) {
      case 'APROBADO': return 'badge--disp-inmediato';
      case 'NO_APROBADO': return 'badge--disp-cancelado';
      case 'PENDIENTE': return e.habilitado ? 'badge--disp-proximo' : 'badge--disp-cerrado';
      default: return 'badge--disp-proximo';
    }
  }

  protected accionExamen(e: ExamenAulaRespuesta): string {
    if (e.estado === 'EN_CURSO') return 'Continuar';
    if (e.estado === 'PENDIENTE' && e.habilitado) return 'Rendir';
    if (e.estado === 'NO_APROBADO' && e.habilitado) return 'Ver y reintentar';
    return 'Ver';
  }

  protected ingresar(item: LeccionDelCurso): void {
    if (this.ingresando() !== null) return;
    this.ingresando.set(item.leccion.id);
    this.sesionApi.ingresar(item.leccion.id).subscribe({
      next: (respuesta) => {
        this.ingresando.set(null);
        window.open(respuesta.enlaceReunion, '_blank');
        this.estado.refrescar();
      },
      error: (error: HttpErrorResponse) => {
        this.ingresando.set(null);
        const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as { message?: string }) : null;
        this.alertas.mostrar('error', cuerpo?.message ?? 'No pudimos registrar tu ingreso a la sesión.');
      },
    });
  }
}
