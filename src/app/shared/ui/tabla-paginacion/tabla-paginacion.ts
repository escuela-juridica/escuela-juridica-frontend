import { Component, computed, input, output } from '@angular/core';

/**
 * Barra de paginación del lado del servidor, colocada encima de la tabla al estilo de un DataTable: a la izquierda el rango y el
 * total de registros («Mostrando 1 a 10 de 25 registros») y a la derecha los controles de página.
 * No pide datos por sí mismo: la pantalla recibe `cambiar` y vuelve a consultar al servidor.
 */
@Component({
  selector: 'app-tabla-paginacion',
  templateUrl: './tabla-paginacion.html',
  styleUrl: './tabla-paginacion.scss',
})
export class TablaPaginacion {
  /** Página actual, base 0 (igual que el backend). */
  readonly pagina = input.required<number>();
  /** Registros por página que pide la pantalla al servidor. */
  readonly tamano = input.required<number>();
  /** Total de registros que cumplen el filtro (`totalElements` del servidor). */
  readonly total = input.required<number>();
  /** Emite la página de destino (base 0). */
  readonly cambiar = output<number>();

  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamano())));
  protected readonly desde = computed(() => (this.total() === 0 ? 0 : this.pagina() * this.tamano() + 1));
  protected readonly hasta = computed(() => Math.min(this.total(), (this.pagina() + 1) * this.tamano()));

  /** Números de página a mostrar: la primera, la última y las vecinas de la actual; `null` es un salto («…»). */
  protected readonly paginas = computed<(number | null)[]>(() => {
    const ultima = this.totalPaginas() - 1;
    const actual = Math.min(this.pagina(), ultima);
    const visibles = new Set<number>([0, ultima, actual - 1, actual, actual + 1]);
    const ordenadas = [...visibles].filter((n) => n >= 0 && n <= ultima).sort((a, b) => a - b);
    const resultado: (number | null)[] = [];
    ordenadas.forEach((n, i) => {
      if (i > 0 && n - ordenadas[i - 1] > 1) resultado.push(null);
      resultado.push(n);
    });
    return resultado;
  });

  protected ir(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas() || pagina === this.pagina()) return;
    this.cambiar.emit(pagina);
  }
}
