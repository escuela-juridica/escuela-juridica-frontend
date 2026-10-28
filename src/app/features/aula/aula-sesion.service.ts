import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, tap } from 'rxjs';

import { AulaApiService } from './aula-api.service';
import { AulaRespuesta, LeccionAulaRespuesta, ModuloAulaRespuesta } from './aula.model';

/** Una lección con el módulo al que pertenece y su posición global en el curso. */
export interface LeccionDelCurso {
  leccion: LeccionAulaRespuesta;
  modulo: ModuloAulaRespuesta;
  /** Posición (1..n) dentro de su módulo. */
  numeroEnModulo: number;
  /** Posición (0..n-1) en el orden global del curso. */
  indice: number;
}

/**
 * Estado compartido del aula de UN curso: el temario completo (módulos, lecciones, exámenes y avance
 * hacia el certificado). Se provee desde el layout del aula, así el resumen, el panel de contenido
 * y el reproductor ven siempre el mismo estado y se actualizan juntos al completar una lección.
 */
@Injectable()
export class AulaSesionService {
  private readonly api = inject(AulaApiService);

  readonly cursoId = signal<number | null>(null);
  readonly aula = signal<AulaRespuesta | null>(null);
  readonly cargando = signal(true);
  readonly errorMensaje = signal<string | null>(null);
  /** Lección que se está viendo ahora (null en el resumen del curso). */
  readonly leccionActualId = signal<number | null>(null);

  readonly lecciones = computed<LeccionDelCurso[]>(() => {
    const aula = this.aula();
    if (!aula) return [];
    let indice = 0;
    return aula.modulos.flatMap((modulo) =>
      modulo.lecciones.map((leccion, i) => ({ leccion, modulo, numeroEnModulo: i + 1, indice: indice++ })),
    );
  });

  readonly leccionActual = computed(() => {
    const id = this.leccionActualId();
    return id == null ? null : (this.lecciones().find((l) => l.leccion.id === id) ?? null);
  });

  readonly anterior = computed(() => {
    const actual = this.leccionActual();
    return actual ? (this.lecciones()[actual.indice - 1] ?? null) : null;
  });

  readonly siguiente = computed(() => {
    const actual = this.leccionActual();
    return actual ? (this.lecciones()[actual.indice + 1] ?? null) : null;
  });

  /** La lección donde "Continuar" debe reabrir el curso (null si no hay ninguna disponible). */
  readonly leccionParaContinuar = computed(() => {
    const id = this.aula()?.ultimaLeccionIdValida;
    return id == null ? null : (this.lecciones().find((l) => l.leccion.id === id) ?? null);
  });

  readonly totalCompletadas = computed(
    () => this.lecciones().filter((l) => l.leccion.estado === 'COMPLETADA').length,
  );

  cargar(cursoId: number): void {
    this.cursoId.set(cursoId);
    this.cargando.set(true);
    this.errorMensaje.set(null);
    this.aula.set(null);
    this.api.temario(cursoId).subscribe({
      next: (respuesta) => {
        this.aula.set(respuesta);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as { message?: string }) : null;
        this.errorMensaje.set(cuerpo?.message ?? 'No pudimos abrir el aula de este curso.');
        this.cargando.set(false);
      },
    });
  }

  /** Vuelve a pedir el temario sin mostrar la pantalla de carga (tras completar una lección, etc.). */
  refrescar(): void {
    this.refrescar$().subscribe({ error: () => undefined });
  }

  /** Igual que {@link refrescar} pero encadenable: emite cuando el estado ya quedó actualizado. */
  refrescar$(): Observable<AulaRespuesta> {
    const cursoId = this.cursoId();
    if (cursoId == null) return EMPTY;
    return this.api.temario(cursoId).pipe(tap((respuesta) => this.aula.set(respuesta)));
  }
}
