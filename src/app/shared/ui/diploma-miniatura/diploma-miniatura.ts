import { Component, input } from '@angular/core';

/** Vista previa ilustrativa de un certificado (no es el documento real): marco, sello y datos clave. */
@Component({
  selector: 'app-diploma-miniatura',
  templateUrl: './diploma-miniatura.html',
  styleUrl: './diploma-miniatura.scss',
})
export class DiplomaMiniatura {
  readonly titular = input.required<string>();
  readonly curso = input.required<string>();
  readonly nivel = input<'NORMAL' | 'REFRENDADO'>('NORMAL');
  readonly entidad = input<string | null>(null);
  readonly anulado = input(false);
}
