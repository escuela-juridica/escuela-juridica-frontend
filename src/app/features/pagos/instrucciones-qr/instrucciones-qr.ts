import { Component, input } from '@angular/core';

import { formatearFechaHoraCorta } from '../../cursos/curso-formato.util';
import { InstruccionesPago } from '../pago.model';

@Component({
  selector: 'app-instrucciones-qr',
  templateUrl: './instrucciones-qr.html',
  styleUrl: './instrucciones-qr.scss',
})
export class InstruccionesQr {
  readonly instrucciones = input.required<InstruccionesPago>();
  protected readonly formatearFechaHoraCorta = formatearFechaHoraCorta;
}
