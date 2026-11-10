import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, tap } from 'rxjs';

import { AlertaGlobalService } from '../../core/notificaciones/alerta-global.service';
import { AulaApiService } from './aula-api.service';
import { AulaRespuesta, LeccionAulaRespuesta, ModuloAulaRespuesta } from './aula.model';
import { estadoModulo } from './aula-ruta.util';

export interface LeccionDelCurso {
  leccion: LeccionAulaRespuesta;
  modulo: ModuloAulaRespuesta;
  numeroEnModulo: number;
  indice: number;
}

@Injectable()
export class AulaSesionService {
  private readonly api = inject(AulaApiService);
  private readonly alertas = inject(AlertaGlobalService);

  readonly cursoId = signal<number | null>(null);
  readonly aula = signal<AulaRespuesta | null>(null);
  readonly cargando = signal(true);
  readonly errorMensaje = signal<string | null>(null);
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

  refrescar(): void {
    this.refrescar$().subscribe({ error: () => undefined });
  }

  refrescar$(): Observable<AulaRespuesta> {
    const cursoId = this.cursoId();
    if (cursoId == null) return EMPTY;
    return this.api.temario(cursoId).pipe(
      tap((respuesta) => {
        this.avisarModulosFinalizados(this.aula(), respuesta);
        this.aula.set(respuesta);
      }),
    );
  }

  private avisarModulosFinalizados(antes: AulaRespuesta | null, despues: AulaRespuesta): void {
    if (!antes) return;
    const yaCompletos = new Set(antes.modulos.filter((modulo) => estadoModulo(modulo) === 'COMPLETADO').map((modulo) => modulo.id));
    despues.modulos.forEach((modulo, indice) => {
      if (estadoModulo(modulo) === 'COMPLETADO' && !yaCompletos.has(modulo.id)) {
        this.alertas.mostrar('exito', `Has finalizado el módulo ${indice + 1}: ${modulo.titulo}.`);
      }
    });
  }
}
