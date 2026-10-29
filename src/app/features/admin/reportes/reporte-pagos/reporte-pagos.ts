import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { formatearPrecio } from '../../../cursos/curso-formato.util';
import { ReporteAcademicoApiService } from '../reporte-academico/reporte-academico-api.service';
import { OpcionCursoReporte } from '../reporte-academico/reporte-academico.model';
import { ReportePagosApiService } from './reporte-pagos-api.service';
import { EstadoPago, OrigenPago, ReportePago, TotalPagos } from './reporte-pagos.model';

/**
 * HU-042 — Reporte de pagos registrados. El detalle, el total y el Excel comparten los mismos filtros. Solo
 * APROBADO y REGISTRADO_MANUAL con monto mayor que cero suman; el resto se muestra en el detalle sin sumar. No es
 * contabilidad ni un comprobante SUNAT.
 */
@Component({
  selector: 'app-reporte-pagos',
  imports: [FormsModule, DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './reporte-pagos.html',
  styleUrl: './reporte-pagos.scss',
})
export class ReportePagosPantalla {
  private readonly api = inject(ReportePagosApiService);
  private readonly cursosApi = inject(ReporteAcademicoApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatearPrecio = formatearPrecio;
  protected readonly filas = signal<ReportePago[]>([]);
  protected readonly cursos = signal<OpcionCursoReporte[]>([]);
  protected readonly medios = signal<string[]>([]);
  protected readonly total = signal<TotalPagos | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalFilas = signal(0);
  protected readonly masFiltros = signal(false);

  protected texto = '';
  protected cursoId: number | null = null;
  protected estado = '';
  protected medio = '';
  protected origen = '';
  protected fechaDesde = '';
  protected fechaHasta = '';

  constructor() {
    this.cursosApi.cursos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (c) => this.cursos.set(c) });
    this.api.medios().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (m) => this.medios.set(m) });
    this.cargar();
  }

  protected get filtrosAvanzadosActivos(): number {
    return [this.estado, this.medio, this.origen].filter(Boolean).length;
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
    this.estado = '';
    this.medio = '';
    this.origen = '';
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
    const filtros = this.filtros();
    this.api.total(filtros).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (t) => this.total.set(t) });
    this.api.reporte(filtros, this.pagina(), 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  protected etiquetaEstado(estado: EstadoPago): string {
    switch (estado) {
      case 'PENDIENTE': return 'Pendiente';
      case 'APROBADO': return 'Aprobado';
      case 'RECHAZADO': return 'Rechazado';
      case 'ERROR': return 'Error';
      case 'EXPIRADO': return 'Expirado';
      case 'REGISTRADO_MANUAL': return 'Registrado manual';
      default: return 'Exonerado';
    }
  }

  protected claseEstado(estado: EstadoPago): string {
    switch (estado) {
      case 'APROBADO':
      case 'REGISTRADO_MANUAL': return 'badge--disp-inmediato';
      case 'PENDIENTE': return 'badge--advertencia-suave';
      case 'EXONERADO': return 'badge--ingreso-manual';
      default: return 'badge--disp-cancelado';
    }
  }

  protected etiquetaOrigen(origen: OrigenPago): string {
    switch (origen) {
      case 'EN_LINEA': return 'En línea (Culqi)';
      case 'MANUAL': return 'Administrativo · pago manual';
      default: return 'Administrativo · exoneración';
    }
  }

  protected etiquetaMedio(medio: string | null): string {
    switch ((medio ?? '').toUpperCase()) {
      case '': return '—';
      case 'TARJETA': return 'Tarjeta';
      case 'YAPE': return 'Yape';
      case 'BILLETERA': return 'Billetera móvil';
      case 'TRANSFERENCIA': return 'Transferencia';
      default: return medio ?? '—';
    }
  }

  private filtros() {
    return {
      texto: this.texto,
      cursoId: this.cursoId,
      estado: this.estado,
      medio: this.medio,
      origen: this.origen,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
    };
  }
}
