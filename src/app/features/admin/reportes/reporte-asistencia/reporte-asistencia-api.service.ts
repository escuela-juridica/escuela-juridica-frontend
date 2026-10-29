import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../../core/api/api.config';
import { PageResponse } from '../../../../core/api/page-response.model';
import { FiltrosReporteAsistencia, OpcionAsistencia, ReporteAsistencia } from './reporte-asistencia.model';

/** HU-045 — Reporte de asistencia. Consume `/api/admin/reportes/asistencia`. */
@Injectable({ providedIn: 'root' })
export class ReporteAsistenciaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/admin/reportes/asistencia`;

  reporte(filtros: FiltrosReporteAsistencia, page = 0, size = 20): Observable<PageResponse<ReporteAsistencia>> {
    const params = this.parametros(filtros).set('page', page).set('size', size);
    return this.http.get<PageResponse<ReporteAsistencia>>(this.base, { params });
  }

  cursos(): Observable<OpcionAsistencia[]> {
    return this.http.get<OpcionAsistencia[]>(`${this.base}/cursos`);
  }

  sesiones(cursoId: number): Observable<OpcionAsistencia[]> {
    return this.http.get<OpcionAsistencia[]>(`${this.base}/cursos/${cursoId}/sesiones`);
  }

  /** La exportación usa exactamente los mismos filtros que la consulta en pantalla. */
  urlExportacionExcel(filtros: FiltrosReporteAsistencia): string {
    return `${this.base}/exportar-excel?${this.parametros(filtros).toString()}`;
  }

  private parametros(filtros: FiltrosReporteAsistencia): HttpParams {
    let params = new HttpParams()
      .set('texto', filtros.texto ?? '')
      .set('modalidad', filtros.modalidad ?? '')
      .set('asistencia', filtros.asistencia ?? '')
      .set('origen', filtros.origen ?? '')
      .set('cumplimiento', filtros.cumplimiento ?? '');
    if (filtros.cursoId) params = params.set('cursoId', filtros.cursoId);
    if (filtros.sesionId) params = params.set('sesionId', filtros.sesionId);
    if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
    return params;
  }
}
