import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ReporteAcademicoApiService } from '../reporte-academico/reporte-academico-api.service';
import { OpcionCursoReporte } from '../reporte-academico/reporte-academico.model';
import { ReporteCertificadosApiService } from './reporte-certificados-api.service';
import { FormaEmision, OpcionEntidad, ReporteCertificado } from './reporte-certificados.model';

/** HU-044 — Reporte de certificados emitidos. Muestra la versión vigente de cada certificado y nunca el
 * PDF ni datos privados. Tabla y Excel comparten la misma consulta y los mismos filtros. */
@Component({
  selector: 'app-reporte-certificados',
  imports: [FormsModule, DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './reporte-certificados.html',
  styleUrl: './reporte-certificados.scss',
})
export class ReporteCertificadosPantalla {
  private readonly api = inject(ReporteCertificadosApiService);
  private readonly cursosApi = inject(ReporteAcademicoApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filas = signal<ReporteCertificado[]>([]);
  protected readonly cursos = signal<OpcionCursoReporte[]>([]);
  protected readonly entidades = signal<OpcionEntidad[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalFilas = signal(0);

  /** Guía §32: en la primera línea solo rango, curso y búsqueda; el resto va en "Más filtros". */
  protected readonly masFiltros = signal(false);

  protected texto = '';
  protected cursoId: number | null = null;
  protected nivel = '';
  protected entidad = '';
  protected estado = '';
  protected forma = '';
  protected fechaDesde = '';
  protected fechaHasta = '';

  constructor() {
    this.cursosApi.cursos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (c) => this.cursos.set(c) });
    this.api.entidades().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (e) => this.entidades.set(e) });
    this.cargar();
  }

  protected get filtrosAvanzadosActivos(): number {
    return [this.nivel, this.entidad, this.estado, this.forma].filter(Boolean).length;
  }

  protected buscar(): void {
    if (this.fechaDesde && this.fechaHasta && this.fechaHasta < this.fechaDesde) {
      this.error.set('La fecha final no puede ser anterior a la inicial.');
      return;
    }
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiarFiltros(): void {
    this.texto = '';
    this.cursoId = null;
    this.nivel = '';
    this.entidad = '';
    this.estado = '';
    this.forma = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.buscar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) return;
    this.pagina.set(pagina);
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.reporte(this.filtros(), this.pagina(), 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.filas.set(r.items);
        this.totalPaginas.set(r.totalPages);
        this.totalFilas.set(r.totalElements);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
        this.error.set(cuerpo?.message ?? 'No pudimos cargar el reporte. Inténtalo nuevamente.');
        this.cargando.set(false);
      },
    });
  }

  protected exportarExcel(): void {
    window.open(this.api.urlExportacionExcel(this.filtros()), '_blank');
  }

  protected etiquetaForma(forma: FormaEmision): string {
    switch (forma) {
      case 'AUTOMATICA': return 'Automática programada';
      case 'SOLICITADA': return 'Confirmada por el alumno';
      default: return 'Manual administrativa';
    }
  }

  private filtros() {
    return {
      texto: this.texto,
      cursoId: this.cursoId,
      nivel: this.nivel,
      entidad: this.entidad,
      estado: this.estado,
      forma: this.forma,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
    };
  }
}
