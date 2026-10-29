import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { formatearFecha, formatearFechaHoraCorta } from '../../cursos/curso-formato.util';
import { ReclamacionConstancia } from '../reclamacion.model';

/** HU-039 — Constancia de una queja o reclamo recién presentado: número, plazo y copia de los datos. */
@Component({
  selector: 'app-reclamacion-constancia',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './reclamacion-constancia.html',
  styleUrl: './reclamacion-constancia.scss',
})
export class ReclamacionConstanciaVista {
  readonly constancia = input.required<ReclamacionConstancia>();

  protected readonly formatearFecha = formatearFecha;
  protected readonly formatearFechaHoraCorta = formatearFechaHoraCorta;

  protected imprimir(): void {
    window.print();
  }
}
