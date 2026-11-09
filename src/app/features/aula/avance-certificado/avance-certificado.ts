import { Component, input } from '@angular/core';

import { AvanceCertificado } from '../aula.model';

@Component({
  selector: 'app-avance-certificado',
  templateUrl: './avance-certificado.html',
  styleUrl: './avance-certificado.scss',
})
export class AvanceCertificadoBloque {
  readonly avance = input.required<AvanceCertificado>();
}
