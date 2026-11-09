import { Component, input } from '@angular/core';

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
