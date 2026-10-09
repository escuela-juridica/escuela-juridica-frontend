import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api/api.config';
import { PageResponse } from '../../core/api/page-response.model';
import { AdvertenciaMatricula, Matricula, MatriculaAdministrativa, MatriculaDetalleAdministrativa } from './matricula.model';

export interface CrearMatriculaAdministrativa {
  usuarioId: number; cursoId: number; condicionEconomica: 'REGISTRADO_MANUAL' | 'EXONERADO';
  importe: number | null; medio: string | null; referencia: string | null; motivo: string;
  confirmoAdvertenciaAcademica: boolean;
}
export interface ReporteMatricula { matriculaId: number; alumno: string; correo: string; curso: string; modalidad: string; fechaMatricula: string; fechaActivacion: string | null; estadoMatricula: string; formaIngreso: string; situacionAcademica: string; estadoCertificado: string; }
export interface FiltrosReporteMatricula { texto?: string; estado?: string; cursoId?: number | null; modalidad?: string; fechaDesde?: string; fechaHasta?: string; }

@Injectable({ providedIn: 'root' })
export class MatriculaApiService {
  private readonly http = inject(HttpClient);

  misCursos(): Observable<Matricula[]> {
    return this.http.get<Matricula[]>(`${API_URL}/app/matriculas`);
  }

  matricularGratis(cursoId: number): Observable<Matricula> {
    return this.http.post<Matricula>(`${API_URL}/cursos/${cursoId}/matricula-gratuita`, {});
  }

  listarAdministrativas(texto = '', estado = '', page = 0, size = 20): Observable<PageResponse<MatriculaAdministrativa>> {
    const params = new HttpParams().set('texto', texto).set('estado', estado).set('page', page).set('size', size);
    return this.http.get<PageResponse<MatriculaAdministrativa>>(`${API_URL}/admin/matriculas`, { params });
  }

  cancelar(id: number, motivo: string): Observable<Matricula> {
    return this.http.patch<Matricula>(`${API_URL}/admin/matriculas/${id}/cancelacion`, { motivo });
  }

  crearAdministrativa(peticion: CrearMatriculaAdministrativa): Observable<Matricula> {
    return this.http.post<Matricula>(`${API_URL}/admin/matriculas`, peticion);
  }
  advertenciaAcademica(cursoId: number): Observable<AdvertenciaMatricula> {
    return this.http.get<AdvertenciaMatricula>(`${API_URL}/admin/cursos/${cursoId}/matriculas/advertencia-academica`);
  }
  detalleAdministrativo(id: number): Observable<MatriculaDetalleAdministrativa> {
    return this.http.get<MatriculaDetalleAdministrativa>(`${API_URL}/admin/matriculas/${id}`);
  }
  reenviarConfirmacion(id: number): Observable<{ enviado: boolean; mensaje: string }> {
    return this.http.post<{ enviado: boolean; mensaje: string }>(`${API_URL}/matriculas/${id}/reenviar-confirmacion`, {});
  }
  reporte(filtros: FiltrosReporteMatricula, page = 0, size = 20): Observable<PageResponse<ReporteMatricula>> {
    const params = this.parametrosReporte(filtros).set('page', page).set('size', size);
    return this.http.get<PageResponse<ReporteMatricula>>(`${API_URL}/admin/reportes/matriculas`, { params });
  }
  urlExportacion(filtros: FiltrosReporteMatricula): string { return this.url('exportar', filtros); }
  urlExportacionPdf(filtros: FiltrosReporteMatricula): string { return this.url('exportar-pdf', filtros); }
  urlExportacionExcel(filtros: FiltrosReporteMatricula): string { return this.url('exportar-excel', filtros); }

  private parametrosReporte(filtros: FiltrosReporteMatricula): HttpParams {
    let params = new HttpParams().set('texto', filtros.texto ?? '').set('estado', filtros.estado ?? '')
      .set('modalidad', filtros.modalidad ?? '');
    if (filtros.cursoId) params = params.set('cursoId', filtros.cursoId);
    if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
    return params;
  }

  private url(formato: string, filtros: FiltrosReporteMatricula): string {
    return `${API_URL}/admin/reportes/matriculas/${formato}?${this.parametrosReporte(filtros).toString()}`;
  }
}
