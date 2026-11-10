import { Component, input, output } from '@angular/core';
import { PreguntaIntento } from '../examen.model';

export type EstadoGuardado = 'idle' | 'guardando' | 'ok' | 'error';

@Component({
  selector: 'app-examen-navegador',
  templateUrl: './examen-navegador.html',
  styleUrl: './examen-navegador.scss',
})
export class ExamenNavegador {
  readonly preguntas = input.required<PreguntaIntento[]>();
  readonly indice = input.required<number>();
  readonly respondidas = input.required<ReadonlySet<number>>();
  readonly guardado = input<EstadoGuardado>('idle');

  readonly ir = output<number>();
}
