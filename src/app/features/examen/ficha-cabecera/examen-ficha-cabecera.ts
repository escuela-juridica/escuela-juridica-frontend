import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { AnilloProgreso } from '../../../shared/ui/anillo-progreso/anillo-progreso';
import { ExamenFicha } from '../examen.model';

/** Portada de la ficha de un examen: cabecera, aviso de estado y las reglas en indicadores. */
@Component({
  selector: 'app-examen-ficha-cabecera',
  imports: [DecimalPipe, AnilloProgreso],
  templateUrl: './examen-ficha-cabecera.html',
  styleUrl: './examen-ficha-cabecera.scss',
})
export class ExamenFichaCabecera {
  readonly ficha = input.required<ExamenFicha>();
}
