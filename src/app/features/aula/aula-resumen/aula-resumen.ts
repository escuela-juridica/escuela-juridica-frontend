import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { formatearFechaHora } from '../../cursos/curso-formato.util';
import { SesionAlumnoApiService } from '../../sesiones/sesion-alumno-api.service';
import { AvanceCertificadoBloque } from '../avance-certificado/avance-certificado';
import { AulaSesionService, LeccionDelCurso } from '../aula-sesion.service';

/** HU-022 / HU-025 — Resumen del curso: avance, dónde continuar, qué falta para el certificado y
 * próximas sesiones en vivo. Es lo que se ve al entrar al aula, antes de abrir una lección. */
@Component({
  selector: 'app-aula-resumen',
  imports: [RouterLink, AvanceCertificadoBloque],
  templateUrl: './aula-resumen.html',
  styleUrl: './aula-resumen.scss',
})
export class AulaResumen {
  protected readonly estado = inject(AulaSesionService);
  private readonly sesionApi = inject(SesionAlumnoApiService);
  private readonly alertas = inject(AlertaGlobalService);

  protected readonly ingresando = signal<number | null>(null);
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
