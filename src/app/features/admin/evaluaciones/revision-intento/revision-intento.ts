import { DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { EvaluacionesApiService } from '../evaluaciones-api.service';
import { PreguntaRevision, RevisionIntento } from '../evaluaciones.model';

interface Captura {
  puntaje: string;
  observacion: string;
}

/**
 * HU-030 — Revisar un intento: respuestas abiertas completas, un puntaje entre 0 y el máximo de cada
 * pregunta (ambos válidos) y una observación opcional visible para el alumno. Publicar califica el
 * intento de una vez (con confirmación) y avisa al alumno; un intento ya calificado queda en solo lectura.
 */
@Component({
  selector: 'app-revision-intento',
  imports: [DatePipe, DecimalPipe, LowerCasePipe, RouterLink, Modal],
  templateUrl: './revision-intento.html',
  styleUrl: './revision-intento.scss',
})
export class RevisionIntentoPantalla {
  private readonly api = inject(EvaluacionesApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly intento = signal<RevisionIntento | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly capturas = signal<Readonly<Record<number, Captura>>>({});
  protected readonly confirmando = signal(false);
  protected readonly publicando = signal(false);
  protected readonly errorPublicar = signal<string | null>(null);
  protected readonly reenviando = signal(false);

  private intentoId = 0;

  protected readonly soloLectura = computed(() => this.intento()?.estado === 'CALIFICADO');

  /** Respuestas que el revisor debe puntuar (las demás ya tienen su puntaje). */
  protected readonly porRevisar = computed(() =>
    (this.intento()?.preguntas ?? []).filter((p) => p.estadoRevision === 'PENDIENTE'),
  );

  protected readonly errores = computed(() => {
    const mapa: Record<number, string | null> = {};
    for (const p of this.porRevisar()) mapa[p.respuestaId] = this.validar(p);
    return mapa;
  });

  protected readonly completo = computed(() => this.porRevisar().every((p) => this.errores()[p.respuestaId] === null));

  /** Nota que resultaría de publicar con lo escrito (misma fórmula del servidor). */
  protected readonly notaResultante = computed<number | null>(() => {
    const it = this.intento();
    if (!it || !this.completo() || it.puntajeTotal <= 0) return null;
    const asignado = this.porRevisar().reduce((s, p) => s + Number(this.capturas()[p.respuestaId]?.puntaje.replace(',', '.')), 0);
    const yaRevisado = it.preguntas.filter((p) => p.estadoRevision === 'REVISADA').reduce((s, p) => s + (p.puntajeAsignado ?? 0), 0);
    return Math.round(((it.puntajeObjetivo + asignado + yaRevisado) * 20 / it.puntajeTotal) * 100) / 100;
  });

  constructor() {
    this.ruta.paramMap
      .pipe(
        map((p) => Number(p.get('intentoId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.intentoId = id;
        this.cargar();
      });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .intento(this.intentoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (it) => {
          this.intento.set(it);
          this.capturas.set(Object.fromEntries(it.preguntas.map((p) => [p.respuestaId, { puntaje: '', observacion: '' }])));
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.error.set(this.mensaje(e) ?? 'No pudimos abrir el intento.');
          this.cargando.set(false);
        },
      });
  }

  protected captura(p: PreguntaRevision): Captura {
    return this.capturas()[p.respuestaId] ?? { puntaje: '', observacion: '' };
  }

  protected escribirPuntaje(p: PreguntaRevision, valor: string): void {
    this.capturas.update((c) => ({ ...c, [p.respuestaId]: { ...this.captura(p), puntaje: valor } }));
  }

  protected escribirObservacion(p: PreguntaRevision, valor: string): void {
    this.capturas.update((c) => ({ ...c, [p.respuestaId]: { ...this.captura(p), observacion: valor } }));
  }

  /** `null` si el puntaje es válido: número entre 0 y el máximo (ambos incluidos), hasta 2 decimales. */
  private validar(p: PreguntaRevision): string | null {
    const crudo = this.captura(p).puntaje.trim().replace(',', '.');
    if (crudo === '') return 'Indica un puntaje.';
    if (!/^\d+(\.\d{1,2})?$/.test(crudo)) return 'Usa un número positivo con hasta dos decimales.';
    const valor = Number(crudo);
    return valor > p.puntajeMaximo ? `No puede superar ${p.puntajeMaximo}.` : null;
  }

  protected abrirConfirmacion(): void {
    if (!this.completo()) return;
    this.errorPublicar.set(null);
    this.confirmando.set(true);
  }

  protected cerrarConfirmacion(): void {
    if (!this.publicando()) this.confirmando.set(false);
  }

  protected publicar(): void {
    if (!this.completo() || this.publicando()) return;
    this.publicando.set(true);
    const respuestas = this.porRevisar().map((p) => ({
      respuestaId: p.respuestaId,
      puntaje: Number(this.captura(p).puntaje.trim().replace(',', '.')),
      observacion: this.captura(p).observacion.trim() || null,
    }));
    this.api
      .calificar(this.intentoId, respuestas)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (it) => {
          this.publicando.set(false);
          this.confirmando.set(false);
          this.intento.set(it);
          this.alertas.mostrar('exito', 'Calificación publicada. Avisamos al alumno por correo.');
        },
        error: (e: HttpErrorResponse) => {
          this.publicando.set(false);
          this.errorPublicar.set(this.mensaje(e) ?? 'No pudimos publicar la calificación.');
        },
      });
  }

  protected reenviarAviso(): void {
    if (this.reenviando()) return;
    this.reenviando.set(true);
    this.api
      .reenviarAviso(this.intentoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.reenviando.set(false);
          this.alertas.mostrar('exito', 'Aviso reenviado.');
        },
        error: (e: HttpErrorResponse) => {
          this.reenviando.set(false);
          this.alertas.mostrar('error', this.mensaje(e) ?? 'No pudimos reenviar el aviso.');
        },
      });
  }

  protected clasePlazo(plazo: string | null): string {
    return plazo === 'VENCIDO' ? 'badge--disp-cancelado' : plazo === 'PROXIMO' ? 'badge--advertencia-suave' : 'badge--disp-proximo';
  }

  protected etiquetaPlazo(plazo: string | null): string {
    return plazo === 'VENCIDO' ? 'Plazo vencido' : plazo === 'PROXIMO' ? 'Vence pronto' : 'En plazo';
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }
}
