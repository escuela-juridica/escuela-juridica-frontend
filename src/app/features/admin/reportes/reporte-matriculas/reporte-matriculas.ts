import { DatePipe, LowerCasePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatriculaApiService, ReporteMatricula } from '../../../matriculas/matricula-api.service';

@Component({
  selector: 'app-reporte-matriculas',
  imports: [FormsModule, DatePipe, LowerCasePipe],
  templateUrl: './reporte-matriculas.html',
  styleUrl: './reporte-matriculas.scss',
})
export class ReporteMatriculas {
  private readonly api = inject(MatriculaApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filas = signal<ReporteMatricula[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected texto = '';
  protected estado = '';
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);

  constructor() {
    this.cargar();
  }

  protected buscar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiarFiltros(): void {
    this.texto = '';
    this.estado = '';
    this.buscar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) {
      return;
    }
    this.pagina.set(pagina);
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .reporte(this.texto, this.estado, this.pagina(), 20)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.filas.set(r.items);
          this.totalPaginas.set(r.totalPages);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No pudimos cargar el reporte. Inténtalo nuevamente.');
          this.cargando.set(false);
        },
      });
  }

  protected exportarPdf(): void {
    window.open(this.api.urlExportacionPdf(this.texto, this.estado), '_blank');
  }

  protected exportarExcel(): void {
    window.open(this.api.urlExportacionExcel(this.texto, this.estado), '_blank');
  }

  protected exportar(): void {
    window.open(this.api.urlExportacion(this.texto, this.estado), '_blank');
  }

  protected etiquetaEstado(estado: string): string {
    return estado === 'ACTIVA' ? 'Activa' : 'Cancelada';
  }

  protected claseEstado(estado: string): string {
    return estado === 'ACTIVA' ? 'badge--disp-inmediato' : 'badge--disp-cancelado';
  }

  protected etiquetaIngreso(formaIngreso: string): string {
    switch (formaIngreso) {
      case 'GRATUITA': return 'Gratuita';
      case 'ADMINISTRADOR': return 'Asignación manual';
      case 'PAGO_EN_LINEA': return 'Pago en línea';
      case 'EXONERADA': return 'Exonerada';
      default: return formaIngreso;
    }
  }

  protected claseIngreso(formaIngreso: string): string {
    switch (formaIngreso) {
      case 'GRATUITA': return 'badge--ingreso-gratuito';
      case 'ADMINISTRADOR': return 'badge--ingreso-manual';
      case 'PAGO_EN_LINEA': return 'badge--ingreso-pago';
      case 'EXONERADA': return 'badge--ingreso-manual';
      default: return 'badge--disp-cerrado';
    }
  }

  protected etiquetaSituacion(situacion: string): string {
    return situacion === 'EN_CURSO' ? 'En curso' : 'Finalizado';
  }

  protected claseSituacion(situacion: string): string {
    return situacion === 'EN_CURSO' ? 'badge--disp-proximo' : 'badge--disp-cerrado';
  }
}
