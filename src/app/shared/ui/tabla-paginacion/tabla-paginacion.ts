import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-tabla-paginacion',
  templateUrl: './tabla-paginacion.html',
  styleUrl: './tabla-paginacion.scss',
})
export class TablaPaginacion {
  readonly pagina = input.required<number>();
  readonly tamano = input.required<number>();
  readonly total = input.required<number>();
  readonly cambiar = output<number>();

  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamano())));
  protected readonly desde = computed(() => (this.total() === 0 ? 0 : this.pagina() * this.tamano() + 1));
  protected readonly hasta = computed(() => Math.min(this.total(), (this.pagina() + 1) * this.tamano()));

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
