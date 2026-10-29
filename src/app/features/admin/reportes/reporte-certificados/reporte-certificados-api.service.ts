import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../../core/api/api.config';
import { PageResponse } from '../../../../core/api/page-response.model';
import { FiltrosReporteCertificados, OpcionEntidad, ReporteCertificado } from './reporte-certificados.model';

/** HU-044 — Reporte de certificados. Consume `/api/admin/reportes/certificados`. */
@Injectable({ providedIn: 'root' })
export class ReporteCertificadosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/admin/reportes/certificados`;

  reporte(filtros: FiltrosReporteCertificados, page = 0, size = 20): Observable<PageResponse<ReporteCertificado>> {
    const params = this.parametros(filtros).set('page', page).set('size', size);
    return this.http.get<PageResponse<ReporteCertificado>>(this.base, { params });
  }

  entidades(): Observable<OpcionEntidad[]> {
    return this.http.get<OpcionEntidad[]>(`${this.base}/entidades`);
  }

  /** La exportación usa exactamente los mismos filtros que la consulta en pantalla. */
  urlExportacionExcel(filtros: FiltrosReporteCertificados): string {
    return `${this.base}/exportar-excel?${this.parametros(filtros).toString()}`;
  }

  private parametros(filtros: FiltrosReporteCertificados): HttpParams {
    let params = new HttpParams()
      .set('texto', filtros.texto ?? '')
      .set('nivel', filtros.nivel ?? '')
      .set('entidad', filtros.entidad ?? '')
      .set('estado', filtros.estado ?? '')
      .set('forma', filtros.forma ?? '');
    if (filtros.cursoId) params = params.set('cursoId', filtros.cursoId);
    if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
    return params;
  }
}
