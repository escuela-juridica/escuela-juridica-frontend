import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

import { resolverUrlApi } from '../../core/api/api.config';
import { AlertaGlobalService } from '../../core/notificaciones/alerta-global.service';
import { AulaApiService } from '../aula/aula-api.service';
import { AulaRespuesta, LeccionAulaRespuesta } from '../aula/aula.model';
import { LeccionReproductorApiService } from './leccion-reproductor-api.service';
import { MaterialAlumnoRespuesta, ProgresoVideoPeticion } from './material-alumno.model';

interface ErrorApiLeccion {
  code?: string;
  message?: string;
}

/** Cada cuánto, como máximo, se reporta avance de un video en reproducción (además de siempre
 * reportar en pausa/fin). Evita golpear el backend en cada evento `timeupdate`. */
const INTERVALO_REPORTE_PROGRESO_MS = 5000;

/** HU-023 — Consultar materiales protegidos. HU-024 — Completar lecciones y registrar progreso.
 * Pantalla "reproductor" de una lección, a la que se llega desde el aula (HU-022). Pantalla
 * inmersiva propia (sin layout-alumno), igual que `Aula`. No existe un endpoint de "una sola
 * lección": se reusa `AulaApiService.temario(cursoId)` y se busca la lección dentro del temario
 * completo, aplicando el mismo patrón de "recargar todo tras un cambio" que usa `curso-editor.ts`. */
@Component({
  selector: 'app-leccion-reproductor',
  imports: [RouterLink],
  templateUrl: './leccion-reproductor.html',
  styleUrl: './leccion-reproductor.scss',
})
export class LeccionReproductor implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly aulaApi = inject(AulaApiService);
  private readonly leccionApi = inject(LeccionReproductorApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly resolverUrlApi = resolverUrlApi;

  protected readonly cargando = signal(true);
  protected readonly cargandoMateriales = signal(false);
  protected readonly completando = signal(false);
  protected readonly errorMensaje = signal<string | null>(null);

  protected readonly cursoId = signal<number>(0);
  protected readonly leccionId = signal<number>(0);
  protected readonly aula = signal<AulaRespuesta | null>(null);
  protected readonly leccionActual = signal<LeccionAulaRespuesta | null>(null);
  protected readonly siguienteLeccionId = signal<number | null>(null);
  protected readonly esUltimaLeccion = signal(false);
  protected readonly materiales = signal<MaterialAlumnoRespuesta[] | null>(null);

  /** Una lección se completa sola (sin botón) si tiene al menos un material VIDEO+SUBIDO activo.
   * Misma regla que aplica el backend. */
  protected readonly esFinalizacionAutomatica = computed(() =>
    (this.materiales() ?? []).some((material) => material.tipoRecurso === 'VIDEO' && material.origen === 'SUBIDO'),
  );

  private readonly duracionPorMaterial = new Map<number, number>();
  private readonly ultimoReporteTs = new Map<number, number>();

  ngOnInit(): void {
    this.ruta.paramMap
      .pipe(
        map((parametros) => ({
          cursoId: Number(parametros.get('cursoId')),
          leccionId: Number(parametros.get('leccionId')),
        })),
        distinctUntilChanged((a, b) => a.cursoId === b.cursoId && a.leccionId === b.leccionId),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ cursoId, leccionId }) => this.cargar(cursoId, leccionId));
  }

  protected cargar(cursoId: number, leccionId: number): void {
    this.cursoId.set(cursoId);
    this.leccionId.set(leccionId);
    this.cargando.set(true);
    this.errorMensaje.set(null);
    this.materiales.set(null);
    this.leccionActual.set(null);
    this.duracionPorMaterial.clear();
    this.ultimoReporteTs.clear();

    this.aulaApi
      .temario(cursoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.aula.set(respuesta);
          const leccion = this.actualizarEstadoLeccion(respuesta, leccionId);
          this.cargando.set(false);
          if (!leccion) {
            this.errorMensaje.set('Esta lección no existe o no pertenece a este curso.');
            return;
          }
          if (leccion.estado === 'BLOQUEADA') {
            return;
          }
          if (leccion.tipo === 'EN_VIVO' && leccion.estadoSesion !== 'REALIZADA') {
            return;
          }
          this.cargarMateriales(leccionId);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMensaje.set(this.mensajeError(error) ?? 'No pudimos abrir esta lección.');
          this.cargando.set(false);
        },
      });
  }

  protected completar(): void {
    if (this.completando()) return;
    this.completando.set(true);
    this.leccionApi
      .completarLeccion(this.leccionId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.completando.set(false);
          const cursoId = this.cursoId();
          const siguiente = this.siguienteLeccionId();
          if (siguiente != null) {
            this.router.navigate(['/aula', cursoId, 'lecciones', siguiente]);
          } else {
            this.router.navigate(['/aula', cursoId]);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.completando.set(false);
          this.alertas.mostrar('error', this.mensajeError(error) ?? 'No pudimos completar la lección.');
        },
      });
  }

  protected onLoadedMetadata(evento: Event, materialId: number): void {
    const video = evento.target as HTMLVideoElement;
    if (Number.isFinite(video.duration)) {
      this.duracionPorMaterial.set(materialId, Math.round(video.duration));
    }
  }

  protected onTimeUpdate(evento: Event, materialId: number): void {
    const ahora = Date.now();
    const ultimo = this.ultimoReporteTs.get(materialId) ?? 0;
    if (ahora - ultimo < INTERVALO_REPORTE_PROGRESO_MS) return;
    this.ultimoReporteTs.set(materialId, ahora);
    this.reportarProgreso(evento.target as HTMLVideoElement, materialId);
  }

  protected onPauseOFin(evento: Event, materialId: number): void {
    this.ultimoReporteTs.set(materialId, Date.now());
    this.reportarProgreso(evento.target as HTMLVideoElement, materialId);
  }

  private reportarProgreso(video: HTMLVideoElement, materialId: number): void {
    const segundos = Math.floor(video.currentTime);
    const duracionConocida = this.duracionPorMaterial.get(materialId);
    const duracionDetectada = duracionConocida ?? (Number.isFinite(video.duration) ? Math.round(video.duration) : null);
    if (duracionDetectada != null) {
      this.duracionPorMaterial.set(materialId, duracionDetectada);
    }

    const peticion: ProgresoVideoPeticion = {
      segundosReproducidos: segundos,
      ultimaPosicionSegundos: segundos,
      duracionSegundosTotal: duracionDetectada,
    };

    this.leccionApi
      .registrarProgresoVideo(materialId, peticion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.refrescarEstadoLeccion(),
        error: () => {
          // El progreso es informativo: si un reporte puntual falla, no interrumpimos la
          // reproducción ni molestamos al alumno; el siguiente evento (u otro pause/ended) reintenta.
        },
      });
  }

  /** Vuelve a pedir el temario completo (sin re-pedir los materiales, para no reconstruir el
   * <video> en pleno uso) y actualiza solo el estado de la lección actual. */
  private refrescarEstadoLeccion(): void {
    const cursoId = this.cursoId();
    this.aulaApi
      .temario(cursoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.aula.set(respuesta);
          this.actualizarEstadoLeccion(respuesta, this.leccionId());
        },
        error: () => {
          // Refresco silencioso: si falla, se mantiene el último estado conocido.
        },
      });
  }

  private actualizarEstadoLeccion(aula: AulaRespuesta, leccionId: number): LeccionAulaRespuesta | null {
    const planas = aula.modulos.flatMap((modulo) => modulo.lecciones);
    const indice = planas.findIndex((leccion) => leccion.id === leccionId);
    if (indice === -1) {
      this.leccionActual.set(null);
      this.siguienteLeccionId.set(null);
      this.esUltimaLeccion.set(false);
      return null;
    }
    const leccion = planas[indice];
    this.leccionActual.set(leccion);
    this.siguienteLeccionId.set(planas[indice + 1]?.id ?? null);
    this.esUltimaLeccion.set(indice === planas.length - 1);
    return leccion;
  }

  private cargarMateriales(leccionId: number): void {
    this.cargandoMateriales.set(true);
    this.leccionApi
      .listarMateriales(leccionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (materiales) => {
          this.materiales.set(materiales);
          this.cargandoMateriales.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.cargandoMateriales.set(false);
          this.alertas.mostrar('error', this.mensajeError(error) ?? 'No pudimos cargar los materiales de la lección.');
        },
      });
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as ErrorApiLeccion) : null;
    return cuerpo?.message ?? null;
  }
}
