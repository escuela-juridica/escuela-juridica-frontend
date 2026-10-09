import { DatePipe, LowerCasePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatriculaApiService, ReporteMatricula, FiltrosReporteMatricula } from '../../../matriculas/matricula-api.service';
import { CursoAdminApiService } from '../../cursos/curso-admin-api.service';
import { CursoResumenRespuesta } from '../../cursos/curso-admin.model';

@Component({
  selector: 'app-reporte-matriculas',
  imports: [FormsModule, DatePipe, LowerCasePipe],
  templateUrl: './reporte-matriculas.html',
  styleUrl: './reporte-matriculas.scss',
})
export class ReporteMatriculas {
  private readonly api = inject(MatriculaApiService);
  private readonly cursosApi = inject(CursoAdminApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filas = signal<ReporteMatricula[]>([]);
  protected readonly cursos = signal<CursoResumenRespuesta[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected texto = '';
  protected estado = '';
  protected cursoId: number | null = null;
  protected modalidad = '';
  protected fechaDesde = '';
  protected fechaHasta = '';
  protected readonly fechaActual = this.formatoFechaLocal(new Date());
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);

  constructor() {
    this.inicializarRangoFechas();
    this.cursosApi.listar('', 0, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => this.cursos.set(r.items),
    });
    this.cargar();
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
    this.estado = '';
    this.cursoId = null;
    this.modalidad = '';
    this.inicializarRangoFechas();
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
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar el reporte. Inténtalo nuevamente.');
        this.cargando.set(false);
      },
    });
  }

  protected exportarPdf(): void { window.open(this.api.urlExportacionPdf(this.filtros()), '_blank'); }
  protected exportarExcel(): void { window.open(this.api.urlExportacionExcel(this.filtros()), '_blank'); }
  protected exportar(): void { window.open(this.api.urlExportacion(this.filtros()), '_blank'); }

  protected etiquetaEstado(estado: string): string {
    switch (estado) {
      case 'ACTIVA': return 'Activa';
      case 'CANCELADA': return 'Cancelada';
      case 'VENCIDA': return 'Vencida';
      case 'PENDIENTE_PAGO': return 'Pendiente de pago';
      case 'FINALIZADA': return 'Finalizada';
      default: return estado;
    }
  }

  protected claseEstado(estado: string): string {
    return estado === 'ACTIVA' ? 'badge--disp-inmediato'
      : estado === 'VENCIDA' ? 'badge--disp-proximo' : 'badge--disp-cancelado';
  }

  protected etiquetaIngreso(formaIngreso: string): string {
    switch (formaIngreso) {
      case 'GRATUITA': return 'Gratuita';
      case 'ADMINISTRADOR': return 'Asignación manual';
      case 'REGISTRADO_MANUAL': return 'Pago manual registrado';
      case 'PAGO_EN_LINEA': return 'Pago en línea';
      case 'EXONERADA': case 'EXONERADO': return 'Exonerada';
      default: return formaIngreso;
    }
  }

  protected claseIngreso(formaIngreso: string): string {
    switch (formaIngreso) {
      case 'GRATUITA': return 'badge--ingreso-gratuito';
      case 'ADMINISTRADOR': return 'badge--ingreso-manual';
      case 'REGISTRADO_MANUAL': return 'badge--ingreso-pago';
      case 'PAGO_EN_LINEA': return 'badge--ingreso-pago';
      case 'EXONERADA': case 'EXONERADO': return 'badge--ingreso-manual';
      default: return 'badge--disp-cerrado';
    }
  }

  protected etiquetaSituacion(situacion: string): string {
    return situacion === 'EN_CURSO' ? 'En curso' : 'Finalizado';
  }

  protected claseSituacion(situacion: string): string {
    return situacion === 'EN_CURSO' ? 'badge--disp-proximo' : 'badge--disp-cerrado';
  }

  protected etiquetaCertificado(estado: string): string {
    switch (estado) {
      case 'VIGENTE': return 'Vigente';
      case 'ANULADO': return 'Anulado';
      default: return 'No emitido';
    }
  }

  private filtros(): FiltrosReporteMatricula {
    return {
      texto: this.texto,
      estado: this.estado,
      cursoId: this.cursoId,
      modalidad: this.modalidad,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
    };
  }

  private inicializarRangoFechas(): void {
    const hoy = new Date();
    const dia = hoy.getDate();
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDiaMesAnterior = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1, 0).getDate();
    mesAnterior.setDate(Math.min(dia, ultimoDiaMesAnterior));
    this.fechaDesde = this.formatoFechaLocal(mesAnterior);
    this.fechaHasta = this.formatoFechaLocal(hoy);
  }

  private formatoFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
