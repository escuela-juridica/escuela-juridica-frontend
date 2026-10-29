import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';

import { formatearFechaHoraCorta } from '../../cursos/curso-formato.util';
import { ConstanciaPago } from '../pago.model';

/** HU-047 — Constancia imprimible de un pago APROBADO. No es un comprobante tributario SUNAT. */
@Component({
  selector: 'app-constancia-pago',
  imports: [DecimalPipe],
  templateUrl: './constancia-pago.html',
  styleUrl: './constancia-pago.scss',
})
export class ConstanciaPagoVista {
  readonly constancia = input.required<ConstanciaPago>();
  protected readonly formatearFechaHoraCorta = formatearFechaHoraCorta;

  protected etiquetaMedio(c: ConstanciaPago): string {
    if (c.medio.startsWith('Tarjeta') || c.medio === 'TARJETA') {
      return c.ultimosDigitos ? `Tarjeta terminada en ${c.ultimosDigitos}` : 'Tarjeta';
    }
    return c.medio;
  }
}
