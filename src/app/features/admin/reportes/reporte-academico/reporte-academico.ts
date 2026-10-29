import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ReporteAcademicoApiService } from './reporte-academico-api.service';
import {
  CondicionReporte,
  FiltrosReporteAcademico,
  OpcionCursoReporte,
  ReporteAcademico,
  SituacionAcademica,
} from './reporte-academico.model';

/** HU-043 — Reporte de seguimiento académico. Una fila por matrícula, con solo las condiciones que
 * el curso exige (valor real y meta). Tabla y Excel comparten la misma consulta y los mismos filtros. */
@Component({
  selector: 'app-reporte-academico',
  imports: [FormsModule, DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './reporte-academico.html',
  styleUrl: './reporte-academico.scss',
})
export class ReporteAcademicoPantalla {
  private readonly api = inject(ReporteAcademicoApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filas = signal<ReporteAcademico[]>([]);
  protected readonly cursos = signal<OpcionCursoReporte[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalFilas = signal(0);

  /** Guía §32: en la primera línea solo rango, curso y búsqueda; el resto va en "Más filtros". */
  protected readonly masFiltros = signal(false);

  protected texto = '';
  protected cursoId: number | null = null;
  protected modalidad = '';
  protected fechaDesde = '';
  protected fechaHasta = '';
  protected situacion = '';
  protected cumplimiento = '';
  protected certificado = '';

  constructor() {
    this.api.cursos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (c) => this.cursos.set(c) });
    this.cargar();
  }

  protected get filtrosAvanzadosActivos(): number {
    return [this.modalidad, this.situacion, this.cumplimiento, this.certificado].filter(Boolean).length;
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
    this.modalidad = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.situacion = '';
    this.cumplimiento = '';
    this.certificado = '';
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
      error: (error: HttpErrorResponse) => {
        const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as { message?: string }) : null;
        this.error.set(cuerpo?.message ?? 'No pudimos cargar el reporte. Inténtalo nuevamente.');
        this.cargando.set(false);
      },
    });
  }

  protected exportarExcel(): void {
    window.open(this.api.urlExportacionExcel(this.filtros()), '_blank');
  }

  protected condicion(fila: ReporteAcademico, codigo: CondicionReporte['codigo']): CondicionReporte | null {
    return fila.condiciones.find((c) => c.codigo === codigo) ?? null;
  }

  protected etiquetaModalidad(modalidad: string): string {
    return modalidad === 'HIBRIDO' ? 'Híbrido' : modalidad === 'EN_VIVO' ? 'En vivo' : 'Virtual';
  }

  protected etiquetaSituacion(situacion: SituacionAcademica): string {
    switch (situacion) {
      case 'FINALIZADO': return 'Finalizado';
      case 'EN_REVISION': return 'En revisión';
      case 'CANCELADA': return 'Matrícula cancelada';
      default: return 'En progreso';
    }
  }

  protected claseSituacion(situacion: SituacionAcademica): string {
    switch (situacion) {
      case 'FINALIZADO': return 'badge--disp-inmediato';
      case 'EN_REVISION': return 'badge--disp-proximo';
      case 'CANCELADA': return 'badge--disp-cancelado';
      default: return 'badge--disp-cerrado';
    }
  }

  private filtros(): FiltrosReporteAcademico {
    return {
      texto: this.texto,
      cursoId: this.cursoId,
      modalidad: this.modalidad,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      situacion: this.situacion,
      cumplimiento: this.cumplimiento,
      certificado: this.certificado,
    };
  }
}
