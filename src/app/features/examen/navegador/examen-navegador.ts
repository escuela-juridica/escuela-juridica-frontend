import { Component, input, output } from '@angular/core';
import { PreguntaIntento } from '../examen.model';

export type EstadoGuardado = 'idle' | 'guardando' | 'ok' | 'error';

/** Cuadrícula para saltar entre las preguntas de un intento y ver cuántas lleva respondidas. */
@Component({
  selector: 'app-examen-navegador',
  templateUrl: './examen-navegador.html',
  styleUrl: './examen-navegador.scss',
})
export class ExamenNavegador {
  readonly preguntas = input.required<PreguntaIntento[]>();
  readonly indice = input.required<number>();
  /** Ids de las preguntas con respuesta (incluye lo escrito que aún no se sincroniza). */
  readonly respondidas = input.required<ReadonlySet<number>>();
  readonly marcadas = input.required<ReadonlySet<number>>();
  readonly guardado = input<EstadoGuardado>('idle');

  readonly ir = output<number>();
}
