import { DatePipe, LowerCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ReporteAsistenciaApiService } from './reporte-asistencia-api.service';
import {
  EstadoAsistenciaReporte,
  FiltrosReporteAsistencia,
  OpcionAsistencia,
  OrigenAsistenciaReporte,
  ReporteAsistencia,
} from './reporte-asistencia.model';

/** HU-045 — Reporte de asistencia a sesiones en vivo. Solo cursos EN_VIVO/HIBRIDO (el selector de
 * cursos nunca ofrece uno virtual). Tabla, porcentaje y Excel comparten la misma consulta. */
@Component({
  selector: 'app-reporte-asistencia',
  imports: [FormsModule, DatePipe, LowerCasePipe, RouterLink, RouterLinkActive],
  templateUrl: './reporte-asistencia.html',
  styleUrl: './reporte-asistencia.scss',
})
export class ReporteAsistenciaPantalla {
  private readonly api = inject(ReporteAsistenciaApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filas = signal<ReporteAsistencia[]>([]);
  protected readonly cursos = signal<OpcionAsistencia[]>([]);
  protected readonly sesiones = signal<OpcionAsistencia[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalFilas = signal(0);

  /** Guía §32: en la primera línea solo rango, curso y búsqueda; el resto va en "Más filtros". */
  protected readonly masFiltros = signal(false);

  protected texto = '';
  protected cursoId: number | null = null;
  protected sesionId: number | null = null;
  protected modalidad = '';
  protected fechaDesde = '';
  protected fechaHasta = '';
  protected asistencia = '';
  protected origen = '';
  protected cumplimiento = '';

  constructor() {
    this.api.cursos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (c) => this.cursos.set(c) });
    this.cargar();
  }

  protected get filtrosAvanzadosActivos(): number {
    return [this.sesionId, this.modalidad, this.asistencia, this.origen, this.cumplimiento].filter(Boolean).length;
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
    this.sesionId = null;
    this.sesiones.set([]);
    this.modalidad = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.asistencia = '';
    this.origen = '';
    this.cumplimiento = '';
    this.buscar();
  }

  /** Las sesiones del filtro dependen del curso elegido; al cambiarlo se recarga la lista. */
  protected cambiarCurso(): void {
    this.sesionId = null;
    this.sesiones.set([]);
    if (this.cursoId) {
      this.api.sesiones(this.cursoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (s) => this.sesiones.set(s),
      });
    }
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

  protected etiquetaAsistencia(estado: EstadoAsistenciaReporte): string {
    switch (estado) {
      case 'PRESENTE': return 'Presente';
      case 'AUSENTE': return 'Ausente';
      case 'JUSTIFICADA': return 'Justificada';
      default: return 'Pendiente';
    }
  }

  protected claseAsistencia(estado: EstadoAsistenciaReporte): string {
    switch (estado) {
      case 'PRESENTE': return 'badge--disp-inmediato';
      case 'AUSENTE': return 'badge--disp-cancelado';
      case 'JUSTIFICADA': return 'badge--disp-proximo';
      default: return 'badge--disp-cerrado';
    }
  }

  protected etiquetaOrigen(origen: OrigenAsistenciaReporte | null): string {
    return origen === 'AUTOMATICA' ? 'Automática'
      : origen === 'CORRECCION_ADMINISTRATIVA' ? 'Corrección administrativa' : '—';
  }

  protected etiquetaModalidad(modalidad: string): string {
    return modalidad === 'HIBRIDO' ? 'Híbrido' : 'En vivo';
  }

  private filtros(): FiltrosReporteAsistencia {
    return {
      texto: this.texto,
      cursoId: this.cursoId,
      sesionId: this.sesionId,
      modalidad: this.modalidad,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      asistencia: this.asistencia,
      origen: this.origen,
      cumplimiento: this.cumplimiento,
    };
  }
}
