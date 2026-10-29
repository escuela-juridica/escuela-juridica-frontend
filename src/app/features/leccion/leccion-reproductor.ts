import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

import { resolverUrlApi } from '../../core/api/api.config';
import { AlertaGlobalService } from '../../core/notificaciones/alerta-global.service';
import { AvanceCertificadoBloque } from '../aula/avance-certificado/avance-certificado';
import { AulaSesionService } from '../aula/aula-sesion.service';
import { formatearDuracion, formatearFechaHora, formatearHora } from '../cursos/curso-formato.util';
import { SesionAlumnoApiService } from '../sesiones/sesion-alumno-api.service';
import { LeccionReproductorApiService } from './leccion-reproductor-api.service';
import { MaterialAlumnoRespuesta, ProgresoVideoPeticion } from './material-alumno.model';

/** Cada cuánto, como máximo, se reporta avance de un video en reproducción (además de siempre
 * reportar en pausa/fin). Evita golpear el backend en cada evento `timeupdate`. */
const INTERVALO_REPORTE_PROGRESO_MS = 5000;

type PestanaLeccion = 'descripcion' | 'materiales' | 'avance';

/**
 * HU-023 / HU-024 — Pantalla de una lección dentro del aula: contenido principal (video, sesión en
 * vivo o material), acciones Anterior / Siguiente, y pestañas con descripción, materiales y avance
 * hacia el certificado. El temario y el panel de contenido son del layout (`AulaShell`): aquí solo
 * se pide lo propio de la lección (sus materiales).
 */
@Component({
  selector: 'app-leccion-reproductor',
  imports: [RouterLink, AvanceCertificadoBloque],
  templateUrl: './leccion-reproductor.html',
  styleUrl: './leccion-reproductor.scss',
})
export class LeccionReproductor {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(LeccionReproductorApiService);
  private readonly sesionApi = inject(SesionAlumnoApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly estado = inject(AulaSesionService);

  protected readonly resolverUrlApi = resolverUrlApi;
  protected readonly formatearFechaHora = formatearFechaHora;
  protected readonly formatearDuracion = formatearDuracion;
  protected readonly formatearHora = formatearHora;

  protected readonly materiales = signal<MaterialAlumnoRespuesta[] | null>(null);
  protected readonly cargandoMateriales = signal(false);
  protected readonly completando = signal(false);
  protected readonly ingresando = signal(false);
  protected readonly pestanaElegida = signal<PestanaLeccion | null>(null);

  private readonly materialesDe = signal<number | null>(null);
  private readonly duracionPorMaterial = new Map<number, number>();
  private readonly ultimoReporteTs = new Map<number, number>();

  protected readonly actual = this.estado.leccionActual;
  protected readonly leccion = computed(() => this.actual()?.leccion ?? null);

  /** Qué se muestra: depende solo del estado real de la lección que devuelve el backend. */
  protected readonly vista = computed<'noEncontrada' | 'bloqueada' | 'sesion' | 'contenido'>(() => {
    const leccion = this.leccion();
    if (!leccion) return 'noEncontrada';
    if (leccion.estado === 'BLOQUEADA') return 'bloqueada';
    if (leccion.tipo === 'EN_VIVO' && leccion.estadoSesion !== 'REALIZADA') return 'sesion';
    return 'contenido';
  });

  protected readonly videoPrincipal = computed(() => this.materiales()?.find((m) => m.tipoRecurso === 'VIDEO') ?? null);

  /** Video de YouTube embebible (solo si la URL trae un identificador válido de 11 caracteres). */
  protected readonly youtubeEmbebido = computed<SafeResourceUrl | null>(() => {
    const video = this.videoPrincipal();
    if (!video || video.origen !== 'YOUTUBE') return null;
    const id = LeccionReproductor.idYoutube(video.verUrl);
    return id
      ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`)
      : null;
  });

  /** Se completa solo (sin botón) si tiene un video SUBIDO: es el único que ESEJUR puede medir. */
  protected readonly esFinalizacionAutomatica = computed(() =>
    (this.materiales() ?? []).some((m) => m.tipoRecurso === 'VIDEO' && m.origen === 'SUBIDO'),
  );

  protected readonly siguienteDisponible = computed(() => {
    const siguiente = this.estado.siguiente();
    return siguiente && siguiente.leccion.estado !== 'BLOQUEADA' ? siguiente : null;
  });

  /** Examen que frena el avance (calificado, de módulo y sin aprobar), para ofrecer rendirlo desde aquí. */
  protected readonly examenBloqueante = computed(
    () => this.estado.aula()?.modulos.flatMap((m) => m.examenes).find((e) => e.bloqueaSiguienteModulo && !e.aprobado) ?? null,
  );

  protected readonly esUltima = computed(() => this.estado.siguiente() === null);

  protected readonly pestanas = computed<{ id: PestanaLeccion; etiqueta: string }[]>(() => {
    const lista: { id: PestanaLeccion; etiqueta: string }[] = [];
    if (this.leccion()?.descripcion) lista.push({ id: 'descripcion', etiqueta: 'Descripción' });
    const n = this.materiales()?.length ?? 0;
    lista.push({ id: 'materiales', etiqueta: n > 0 ? `Materiales (${n})` : 'Materiales' });
    lista.push({ id: 'avance', etiqueta: 'Mi avance' });
    return lista;
  });

  protected readonly pestana = computed<PestanaLeccion>(() => this.pestanaElegida() ?? this.pestanas()[0].id);

  constructor() {
    this.ruta.paramMap
      .pipe(
        map((parametros) => Number(parametros.get('leccionId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((leccionId) => {
        this.materiales.set(null);
        this.materialesDe.set(null);
        this.pestanaElegida.set(null);
        this.duracionPorMaterial.clear();
        this.ultimoReporteTs.clear();
        this.estado.leccionActualId.set(leccionId);
        window.scrollTo({ top: 0 });
      });

    // Los materiales se piden cuando la lección es consultable (no bloqueada ni sesión pendiente).
    effect(() => {
      const vista = this.vista();
      const id = this.estado.leccionActualId();
      if (vista === 'contenido' && id != null && this.materialesDe() !== id) {
        untracked(() => this.cargarMateriales(id));
      }
    });
  }

  protected elegirPestana(pestana: PestanaLeccion): void {
    this.pestanaElegida.set(pestana);
  }

  /** "Siguiente" / "Completar lección" en una lección manual: registra una sola finalización. */
  protected completarYContinuar(): void {
    const leccion = this.leccion();
    if (!leccion || this.completando()) return;
    this.completando.set(true);
    this.api
      .completarLeccion(leccion.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.completando.set(false);
          // La siguiente lección puede quedar bloqueada (p. ej. por un examen): se decide con el estado real.
          this.estado
            .refrescar$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => this.irAlSiguiente(),
              error: () => this.irAlSiguiente(),
            });
        },
        error: (error: HttpErrorResponse) => {
          this.completando.set(false);
          this.alertas.mostrar('error', this.mensajeError(error) ?? 'No pudimos completar la lección.');
        },
      });
  }

  protected ingresarASesion(): void {
    const leccion = this.leccion();
    if (!leccion || this.ingresando()) return;
    this.ingresando.set(true);
    this.sesionApi
      .ingresar(leccion.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.ingresando.set(false);
          window.open(respuesta.enlaceReunion, '_blank');
          this.estado.refrescar();
        },
        error: (error: HttpErrorResponse) => {
          this.ingresando.set(false);
          this.alertas.mostrar('error', this.mensajeError(error) ?? 'No pudimos registrar tu ingreso a la sesión.');
        },
      });
  }

  // ------------------------------------------------------------ video propio --

  protected onLoadedMetadata(evento: Event, material: MaterialAlumnoRespuesta): void {
    const video = evento.target as HTMLVideoElement;
    if (Number.isFinite(video.duration)) {
      this.duracionPorMaterial.set(material.id, Math.round(video.duration));
      // Retoma donde se quedó (Udemy-style), salvo que ya casi lo haya terminado.
      const posicion = material.posicionSegundos ?? 0;
      if (posicion > 5 && video.duration - posicion > 5) {
        video.currentTime = posicion;
      }
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
    const conocida = this.duracionPorMaterial.get(materialId);
    const duracion = conocida ?? (Number.isFinite(video.duration) ? Math.round(video.duration) : null);
    if (duracion != null) this.duracionPorMaterial.set(materialId, duracion);

    const peticion: ProgresoVideoPeticion = {
      segundosReproducidos: segundos,
      ultimaPosicionSegundos: segundos,
      duracionSegundosTotal: duracion,
    };
    this.api
      .registrarProgresoVideo(materialId, peticion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Un reporte puntual que falle no debe interrumpir la reproducción: el siguiente lo reintenta.
        next: () => this.estado.refrescar(),
        error: () => undefined,
      });
  }

  // ----------------------------------------------------------- presentación --

  protected etiquetaFormato(material: MaterialAlumnoRespuesta): string {
    if (material.origen === 'YOUTUBE') return 'YouTube';
    if (material.origen === 'EXTERNO') return 'Enlace externo';
    const nombre = material.nombreArchivo ?? '';
    const punto = nombre.lastIndexOf('.');
    return punto >= 0 ? nombre.slice(punto + 1).toUpperCase() : material.tipoRecurso === 'VIDEO' ? 'Video' : 'Archivo';
  }

  protected metaMaterial(material: MaterialAlumnoRespuesta): string {
    const partes = [this.etiquetaFormato(material)];
    if (material.tamanoBytes) partes.push(LeccionReproductor.formatearTamano(material.tamanoBytes));
    if (material.duracionSegundos) partes.push(formatearDuracion(material.duracionSegundos));
    return partes.join(' · ');
  }

  private irAlSiguiente(): void {
    const cursoId = this.estado.cursoId();
    const siguiente = this.siguienteDisponible();
    if (siguiente) {
      void this.router.navigate(['/aula', cursoId, 'lecciones', siguiente.leccion.id]);
    } else {
      void this.router.navigate(['/aula', cursoId]);
    }
  }

  private cargarMateriales(leccionId: number): void {
    this.materialesDe.set(leccionId);
    this.cargandoMateriales.set(true);
    this.api
      .listarMateriales(leccionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (materiales) => {
          if (this.estado.leccionActualId() !== leccionId) return;
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
    const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }

  private static idYoutube(url: string): string | null {
    try {
      const u = new URL(url);
      let id: string | null = null;
      if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
      else if (u.searchParams.get('v')) id = u.searchParams.get('v');
      else id = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? null;
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    } catch {
      return null;
    }
  }

  private static formatearTamano(bytes: number): string {
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}
