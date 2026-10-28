import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../../core/api/api.config';
import { PageResponse } from '../../../../core/api/page-response.model';
import { FiltrosReporteAcademico, OpcionCursoReporte, ReporteAcademico } from './reporte-academico.model';

/** HU-043 — Reporte académico. Consume `/api/admin/reportes/academico`. */
@Injectable({ providedIn: 'root' })
export class ReporteAcademicoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/admin/reportes/academico`;

  reporte(filtros: FiltrosReporteAcademico, page = 0, size = 20): Observable<PageResponse<ReporteAcademico>> {
    const params = this.parametros(filtros).set('page', page).set('size', size);
    return this.http.get<PageResponse<ReporteAcademico>>(this.base, { params });
  }

  cursos(): Observable<OpcionCursoReporte[]> {
    return this.http.get<OpcionCursoReporte[]>(`${this.base}/cursos`);
  }

  /** La exportación usa exactamente los mismos filtros que la consulta en pantalla. */
  urlExportacionExcel(filtros: FiltrosReporteAcademico): string {
    return `${this.base}/exportar-excel?${this.parametros(filtros).toString()}`;
  }

  private parametros(filtros: FiltrosReporteAcademico): HttpParams {
    let params = new HttpParams()
      .set('texto', filtros.texto ?? '')
      .set('modalidad', filtros.modalidad ?? '')
      .set('situacion', filtros.situacion ?? '')
      .set('cumplimiento', filtros.cumplimiento ?? '')
      .set('certificado', filtros.certificado ?? '');
    if (filtros.cursoId) params = params.set('cursoId', filtros.cursoId);
    if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
    return params;
  }
}
