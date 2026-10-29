import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

import { PuntoGrafico, compacto, maximoEntero, maximoLimpio } from '../grafico.model';

let contadorDegradados = 0;
const ALTO = 250;
const MARGEN = { izquierda: 46, derecha: 14, arriba: 22, abajo: 30 };
const PLANO_ALTO = ALTO - MARGEN.arriba - MARGEN.abajo;
const GROSOR_MAXIMO = 24;

/**
 * Serie en el tiempo: área con línea (evolución) o columnas (importes). Marcas finas, cuadrícula discreta, una guía
 * vertical que sigue el puntero con el valor de ese periodo y una sola etiqueta directa (el máximo). Se dibuja a
 * escala 1:1 con el ancho real del contenedor para que el texto conserve su tamaño. Los datos también están
 * disponibles como tabla desde la tarjeta que lo contiene: el hover no es la única vía.
 */
@Component({
  selector: 'app-grafico-serie',
  templateUrl: './grafico-serie.html',
  styleUrl: './grafico-serie.scss',
})
export class GraficoSerie {
  readonly puntos = input.required<PuntoGrafico[]>();
  readonly tipo = input<'area' | 'columnas'>('area');
  readonly color = input('var(--viz-1, #2a78d6)');
  readonly nombre = input('Valor');
  /** Conteos: el eje solo marca números enteros (nunca 0,5 matrículas). */
  readonly entero = input(false);
  readonly formato = input<(valor: number) => string>((valor) => String(valor));
  /** Descripción para lectores de pantalla. */
  readonly descripcion = input('Gráfico de evolución');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Identificador único del degradado de relleno de esta instancia. */
  protected readonly idDegradado = `grafico-serie-${++contadorDegradados}`;
  protected readonly ancho = signal(560);
  protected readonly alto = ALTO;
  protected readonly margen = MARGEN;
  protected readonly planoAlto = PLANO_ALTO;
  protected readonly planoAncho = computed(() => Math.max(120, this.ancho() - MARGEN.izquierda - MARGEN.derecha));
  protected readonly indiceActivo = signal<number | null>(null);

  constructor() {
    afterNextRender(() => {
      const observador = new ResizeObserver((entradas) => {
        const ancho = Math.round(entradas[0].contentRect.width);
        if (ancho > 0) this.ancho.set(ancho);
      });
      observador.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observador.disconnect());
    });
  }

  protected readonly maximo = computed(() => {
    const mayor = Math.max(0, ...this.puntos().map((p) => p.valor));
    return this.entero() ? maximoEntero(mayor) : maximoLimpio(mayor);
  });
  protected readonly vacio = computed(() => this.puntos().every((p) => p.valor === 0));

  /** Marcas del eje Y: 0 y cuatro tramos iguales hasta el máximo limpio. */
  protected readonly marcasY = computed(() => {
    const max = this.maximo();
    return [0, 1, 2, 3, 4].map((i) => ({ valor: (max / 4) * i, y: PLANO_ALTO - (PLANO_ALTO * i) / 4 }));
  });

  /** Posición horizontal del periodo i: columnas al centro de su banda; área de borde a borde. */
  protected x(indice: number): number {
    const n = this.puntos().length;
    const ancho = this.planoAncho();
    if (this.tipo() === 'columnas') return ((indice + 0.5) * ancho) / n;
    return n <= 1 ? ancho / 2 : (indice * ancho) / (n - 1);
  }

  protected y(valor: number): number {
    return PLANO_ALTO - (valor / this.maximo()) * PLANO_ALTO;
  }

  protected readonly linea = computed(() => {
    const puntos = this.puntos();
    if (puntos.length === 0) return '';
    return puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${this.x(i).toFixed(1)},${this.y(p.valor).toFixed(1)}`).join(' ');
  });

  protected readonly relleno = computed(() => {
    const puntos = this.puntos();
    if (puntos.length === 0) return '';
    const ultimo = puntos.length - 1;
    return `${this.linea()} L${this.x(ultimo).toFixed(1)},${PLANO_ALTO} L${this.x(0).toFixed(1)},${PLANO_ALTO} Z`;
  });

  protected readonly columnas = computed(() => {
    const n = this.puntos().length;
    const banda = this.planoAncho() / Math.max(n, 1);
    const grosor = Math.min(GROSOR_MAXIMO, banda * 0.62);
    return this.puntos().map((p, i) => {
      const alto = PLANO_ALTO - this.y(p.valor);
      return { trazo: trazoColumna(this.x(i) - grosor / 2, this.y(p.valor), grosor, alto) };
    });
  });

  /** Etiquetas del eje X, raleadas para no superponerse (según el ancho disponible). */
  protected readonly etiquetasX = computed(() => {
    const n = this.puntos().length;
    const maximoEtiquetas = Math.max(2, Math.floor(this.planoAncho() / 70));
    const paso = Math.max(1, Math.ceil(n / maximoEtiquetas));
    return this.puntos().map((p, i) => ({ i, texto: p.etiqueta, x: this.x(i) })).filter((e) => e.i % paso === 0);
  });

  /** La única etiqueta directa: el máximo de la serie (si hay algo que mostrar). */
  protected readonly pico = computed(() => {
    const puntos = this.puntos();
    let mejor = -1;
    puntos.forEach((p, i) => { if (p.valor > 0 && (mejor < 0 || p.valor > puntos[mejor].valor)) mejor = i; });
    return mejor < 0 ? null : { i: mejor, x: this.x(mejor), y: this.y(puntos[mejor].valor), texto: this.formato()(puntos[mejor].valor) };
  });

  protected readonly activo = computed(() => {
    const i = this.indiceActivo();
    const p = i === null ? null : this.puntos()[i];
    return i === null || !p ? null : { i, x: this.x(i), y: this.y(p.valor), etiqueta: p.etiqueta, texto: this.formato()(p.valor) };
  });

  protected mover(evento: PointerEvent): void {
    const n = this.puntos().length;
    if (n === 0) return;
    const caja = (evento.currentTarget as SVGRectElement).getBoundingClientRect();
    const x = ((evento.clientX - caja.left) / caja.width) * this.planoAncho();
    const indice = this.tipo() === 'columnas'
      ? Math.floor((x / this.planoAncho()) * n)
      : n <= 1 ? 0 : Math.round((x / this.planoAncho()) * (n - 1));
    this.indiceActivo.set(Math.min(Math.max(indice, 0), n - 1));
  }

  protected salir(): void {
    this.indiceActivo.set(null);
  }

  protected etiquetaEje(valor: number): string {
    return compacto(valor);
  }
}

/** Columna con 4 px redondeados en el extremo de datos y base recta sobre la línea cero. */
function trazoColumna(x: number, y: number, ancho: number, alto: number): string {
  if (alto <= 0) return '';
  const r = Math.min(4, alto, ancho / 2);
  return `M${x},${y + alto} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + ancho - r},${y} Q${x + ancho},${y} ${x + ancho},${y + r} L${x + ancho},${y + alto} Z`;
}
