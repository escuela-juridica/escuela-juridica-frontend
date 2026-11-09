import { Component, computed, input, signal } from '@angular/core';

import { PuntoGrafico } from '../grafico.model';

export interface BarraGrafico extends PuntoGrafico {
  color?: string;
}

@Component({
  selector: 'app-grafico-barras',
  templateUrl: './grafico-barras.html',
  styleUrl: './grafico-barras.scss',
})
export class GraficoBarras {
  readonly barras = input.required<BarraGrafico[]>();
  readonly color = input('var(--viz-1, #2a78d6)');
  readonly nombre = input('Valor');
  readonly descripcion = input('Gráfico de barras');
  readonly conPunto = input(false);
  readonly holgado = input(false);

  protected readonly activa = signal<number | null>(null);
  protected readonly maximo = computed(() => Math.max(1, ...this.barras().map((b) => b.valor)));
  protected readonly vacio = computed(() => this.barras().every((b) => b.valor === 0));

  protected ancho(valor: number): number {
    return (valor / this.maximo()) * 85;
  }
}
