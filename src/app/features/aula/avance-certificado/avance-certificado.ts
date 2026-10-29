import { Component, input } from '@angular/core';

import { AvanceCertificado } from '../aula.model';

/** HU-025 — "Tu avance hacia el certificado": solo las condiciones activas del curso, cada una con
 * su valor real y su meta, y una frase accionable. Se usa en el resumen del curso y en la pestaña
 * "Mi avance" de cada lección. */
@Component({
  selector: 'app-avance-certificado',
  templateUrl: './avance-certificado.html',
  styleUrl: './avance-certificado.scss',
})
export class AvanceCertificadoBloque {
  readonly avance = input.required<AvanceCertificado>();
}
