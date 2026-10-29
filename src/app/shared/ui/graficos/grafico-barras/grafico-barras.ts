import { Component, computed, input, signal } from '@angular/core';

import { PuntoGrafico } from '../grafico.model';

export interface BarraGrafico extends PuntoGrafico {
  /** Color propio de la barra (entidad con identidad fija); si falta se usa el color del gráfico. */
  color?: string;
}

/**
 * Barras horizontales ordenadas: la etiqueta a la izquierda, la barra (de hasta 24 px, con 4 px redondeados en el
 * extremo de datos y base recta) y el valor en la punta. Cada barra es su propio blanco de hover y foco, con un
 * tooltip que repite etiqueta y valor; los mismos datos están disponibles como tabla desde la tarjeta.
 */
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
  /** Muestra junto a cada etiqueta un punto del color de su barra (categorías con identidad propia). */
  readonly conPunto = input(false);
  /** Filas más altas, para distribuciones con pocas categorías. */
  readonly holgado = input(false);

  protected readonly activa = signal<number | null>(null);
  protected readonly maximo = computed(() => Math.max(1, ...this.barras().map((b) => b.valor)));
  protected readonly vacio = computed(() => this.barras().every((b) => b.valor === 0));

  protected ancho(valor: number): number {
    // Deja un 15 % libre a la derecha para que el valor de la barra más larga no se salga de la pista.
    return (valor / this.maximo()) * 85;
  }
}
