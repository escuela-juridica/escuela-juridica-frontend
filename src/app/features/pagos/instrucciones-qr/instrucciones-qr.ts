import { Component, input } from '@angular/core';

import { formatearFechaHoraCorta } from '../../cursos/curso-formato.util';
import { InstruccionesPago } from '../pago.model';

/**
 * HU-047 — QR de una orden de billetera (Plin, Yape, etc.) que sigue pendiente. Culqi solo lo muestra una vez dentro
 * de su checkout; aquí el alumno puede volver a verlo mientras la orden no venza.
 */
@Component({
  selector: 'app-instrucciones-qr',
  templateUrl: './instrucciones-qr.html',
  styleUrl: './instrucciones-qr.scss',
})
export class InstruccionesQr {
  readonly instrucciones = input.required<InstruccionesPago>();
  protected readonly formatearFechaHoraCorta = formatearFechaHoraCorta;
}
