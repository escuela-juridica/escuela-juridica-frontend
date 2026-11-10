import { Component, computed, input } from '@angular/core';

import { formatearNombrePropio } from '../../../core/session/nombre-utils';

@Component({
  selector: 'app-diploma-miniatura',
  templateUrl: './diploma-miniatura.html',
  styleUrl: './diploma-miniatura.scss',
})
export class DiplomaMiniatura {
  readonly titular = input.required<string>();
  protected readonly titularPresentado = computed(() => formatearNombrePropio(this.titular()));
  readonly curso = input.required<string>();
  readonly nivel = input<'NORMAL' | 'REFRENDADO'>('NORMAL');
  readonly entidad = input<string | null>(null);
  readonly anulado = input(false);
}
