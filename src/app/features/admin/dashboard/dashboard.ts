import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectComponent } from '@ng-select/ng-select';

import { BarraGrafico, GraficoBarras } from '../../../shared/ui/graficos/grafico-barras/grafico-barras';
import { GraficoSerie } from '../../../shared/ui/graficos/grafico-serie/grafico-serie';
import { PuntoGrafico } from '../../../shared/ui/graficos/grafico.model';
import { formatearPrecio } from '../../cursos/curso-formato.util';
import { ReporteAcademicoApiService } from '../reportes/reporte-academico/reporte-academico-api.service';
import { OpcionCursoReporte } from '../reportes/reporte-academico/reporte-academico.model';
import { DashboardApiService } from './dashboard-api.service';
import { Dashboard } from './dashboard.model';

type Rango = 'ANIO' | 'ANIO_ANTERIOR' | 'ULTIMOS_90' | 'MES' | 'PERSONALIZADO';
type IdGrafico = 'evolucion' | 'cursos' | 'ingreso' | 'pagos';

/** Colores de la forma de ingreso: cada una conserva el suyo aunque otra quede en cero (paleta validada). */
const COLOR_INGRESO: Record<string, string> = {
  PAGO_EN_LINEA: 'var(--viz-1)',
  REGISTRADO_MANUAL: 'var(--viz-2)',
  EXONERADO: 'var(--viz-3)',
  GRATUITA: 'var(--viz-4)',
};

const PERIODOS: { id: Rango; etiqueta: string }[] = [
  { id: 'ANIO', etiqueta: 'Este año' },
  { id: 'ANIO_ANTERIOR', etiqueta: 'Año anterior' },
  { id: 'ULTIMOS_90', etiqueta: 'Últimos 90 días' },
  { id: 'MES', etiqueta: 'Este mes' },
  { id: 'PERSONALIZADO', etiqueta: 'Personalizado' },
];

const MODALIDADES = [
  { id: 'VIRTUAL', etiqueta: 'Virtual' },
  { id: 'EN_VIVO', etiqueta: 'En vivo' },
  { id: 'HIBRIDO', etiqueta: 'Híbrido' },
];

/** Rampa secuencial azul (pasos 250 → 600 de la paleta validada). */
const RAMPA_AZUL = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#184f95'];

/**
 * HU-046 — PF-040: dashboard administrativo. Exactamente cuatro gráficos (matrículas activadas, matrículas por curso,
 * forma de ingreso y pagos confirmados) bajo un mismo rango, curso y modalidad; sin indicadores extra, tareas ni
 * alertas. Cada gráfico puede verse también como tabla. Al abrir usa el año calendario actual.
 */
@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, NgSelectComponent, GraficoSerie, GraficoBarras],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPantalla {
  private readonly api = inject(DashboardApiService);
  private readonly cursosApi = inject(ReporteAcademicoApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly periodos = PERIODOS;
  protected readonly modalidades = MODALIDADES;
  protected readonly formatearPrecio = formatearPrecio;
  protected readonly datos = signal<Dashboard | null>(null);
  protected readonly cursos = signal<OpcionCursoReporte[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tablas = signal<ReadonlySet<IdGrafico>>(new Set());

  private ultimaPeticion = 0;

  protected rango: Rango = 'ANIO';
  protected desde = '';
  protected hasta = '';
  protected cursoId: number | null = null;
  /** `null` = todas (un texto vacío se vería como un valor elegido en el selector). */
  protected modalidad: string | null = null;

  protected readonly evolucion = computed<PuntoGrafico[]>(() =>
    (this.datos()?.matriculasPorPeriodo ?? []).map((p) => ({ etiqueta: p.etiqueta, valor: p.valor })));
  /** Un solo tono azul de claro a oscuro según el valor: más matrículas, más intenso (nunca más claro que el paso 250). */
  protected readonly porCurso = computed<BarraGrafico[]>(() => {
    const barras = this.datos()?.matriculasPorCurso ?? [];
    const mayor = Math.max(1, ...barras.map((b) => b.valor));
    return barras.map((b) => ({
      etiqueta: b.etiqueta,
      valor: b.valor,
      color: RAMPA_AZUL[Math.min(RAMPA_AZUL.length - 1, Math.round((b.valor / mayor) * (RAMPA_AZUL.length - 1)))],
    }));
  });
  protected readonly porIngreso = computed<BarraGrafico[]>(() =>
    (this.datos()?.formaIngreso ?? []).map((b) => ({ etiqueta: b.etiqueta, valor: b.valor, color: COLOR_INGRESO[b.clave] })));
  protected readonly pagos = computed<PuntoGrafico[]>(() =>
    (this.datos()?.pagosPorPeriodo ?? []).map((p) => ({ etiqueta: p.etiqueta, valor: p.monto })));

  protected readonly formatoMonto = (valor: number): string => formatearPrecio(valor);

  constructor() {
    this.cursosApi.cursos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (c) => this.cursos.set(c) });
    // Los filtros viajan en la URL: recargar o compartir el enlace conserva la misma vista.
    const q = this.ruta.snapshot.queryParamMap;
    const curso = Number(q.get('curso'));
    this.cursoId = Number.isInteger(curso) && curso > 0 ? curso : null;
    this.modalidad = MODALIDADES.some((m) => m.id === q.get('modalidad')) ? (q.get('modalidad') as string) : null;
    const rango = PERIODOS.find((p) => p.id === q.get('rango'))?.id ?? 'ANIO';
    if (rango === 'PERSONALIZADO' && esFecha(q.get('desde')) && esFecha(q.get('hasta'))) {
      this.rango = rango;
      this.desde = q.get('desde') as string;
      this.hasta = q.get('hasta') as string;
      this.cargar();
    } else {
      this.aplicarRango(rango === 'PERSONALIZADO' ? 'ANIO' : rango);
    }
  }

  protected cambiarRango(rango: Rango): void {
    this.rango = rango;
    if (rango !== 'PERSONALIZADO') this.aplicarRango(rango);
  }

  /** Cambiar una fecha a mano pasa a un rango personalizado. */
  protected editarFechas(): void {
    this.rango = 'PERSONALIZADO';
    if (this.desde && this.hasta && this.hasta < this.desde) {
      this.error.set('La fecha final no puede ser anterior a la inicial.');
      return;
    }
    this.cargar();
  }

  protected cargar(): void {
    this.cursoId = this.cursoId ?? null;
    this.modalidad = this.modalidad ?? null;
    this.cargando.set(true);
    this.error.set(null);
    this.guardarEnUrl();
    const peticion = ++this.ultimaPeticion;
    this.api.consultar({ desde: this.desde, hasta: this.hasta, cursoId: this.cursoId, modalidad: this.modalidad ?? '' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          if (peticion !== this.ultimaPeticion) return; // Llegó tarde: ya hay una consulta más nueva.
          this.datos.set(d);
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          if (peticion !== this.ultimaPeticion) return;
          const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
          this.error.set(cuerpo?.message ?? 'No pudimos cargar el dashboard. Inténtalo nuevamente.');
          this.cargando.set(false);
        },
      });
  }

  private guardarEnUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.ruta,
      replaceUrl: true,
      queryParams: {
        rango: this.rango === 'ANIO' ? null : this.rango,
        desde: this.rango === 'PERSONALIZADO' ? this.desde : null,
        hasta: this.rango === 'PERSONALIZADO' ? this.hasta : null,
        curso: this.cursoId,
        modalidad: this.modalidad || null,
      },
    });
  }

  protected alternarTabla(id: IdGrafico): void {
    this.tablas.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  protected conTabla(id: IdGrafico): boolean {
    return this.tablas().has(id);
  }

  protected get tituloRango(): string {
    const d = this.datos();
    return d ? `${fechaCorta(d.desde)} al ${fechaCorta(d.hasta)}` : '';
  }

  private aplicarRango(rango: Exclude<Rango, 'PERSONALIZADO'>): void {
    this.rango = rango;
    const hoy = new Date();
    const anio = hoy.getFullYear();
    switch (rango) {
      case 'ANIO_ANTERIOR':
        this.desde = `${anio - 1}-01-01`;
        this.hasta = `${anio - 1}-12-31`;
        break;
      case 'ULTIMOS_90': {
        const inicio = new Date(hoy);
        inicio.setDate(inicio.getDate() - 89);
        this.desde = fechaIso(inicio);
        this.hasta = fechaIso(hoy);
        break;
      }
      case 'MES':
        this.desde = fechaIso(new Date(anio, hoy.getMonth(), 1));
        this.hasta = fechaIso(new Date(anio, hoy.getMonth() + 1, 0));
        break;
      default:
        this.desde = `${anio}-01-01`;
        this.hasta = `${anio}-12-31`;
    }
    this.cargar();
  }
}

function esFecha(valor: string | null): boolean {
  return !!valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(valor));
}

/** Fecha local en formato ISO (sin pasar por UTC, que podría correrla un día). */
function fechaIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}
