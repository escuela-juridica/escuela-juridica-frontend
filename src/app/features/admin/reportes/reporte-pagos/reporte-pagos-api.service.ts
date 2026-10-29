import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../../core/api/api.config';
import { PageResponse } from '../../../../core/api/page-response.model';
import { FiltrosReportePagos, ReportePago, TotalPagos } from './reporte-pagos.model';

/** HU-042 — Reporte de pagos. Consume `/api/admin/reportes/pagos`. */
@Injectable({ providedIn: 'root' })
export class ReportePagosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/admin/reportes/pagos`;

  reporte(filtros: FiltrosReportePagos, page = 0, size = 20): Observable<PageResponse<ReportePago>> {
    const params = this.parametros(filtros).set('page', page).set('size', size);
    return this.http.get<PageResponse<ReportePago>>(this.base, { params });
  }

  /** Total de pagos confirmados con los mismos filtros que el detalle. */
  total(filtros: FiltrosReportePagos): Observable<TotalPagos> {
    return this.http.get<TotalPagos>(`${this.base}/total`, { params: this.parametros(filtros) });
  }

  medios(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/medios`);
  }

  /** La exportación usa exactamente los mismos filtros que la consulta en pantalla. */
  urlExportacionExcel(filtros: FiltrosReportePagos): string {
    return `${this.base}/exportar-excel?${this.parametros(filtros).toString()}`;
  }

  private parametros(filtros: FiltrosReportePagos): HttpParams {
    let params = new HttpParams()
      .set('texto', filtros.texto ?? '')
      .set('estado', filtros.estado ?? '')
      .set('medio', filtros.medio ?? '')
      .set('origen', filtros.origen ?? '');
    if (filtros.cursoId) params = params.set('cursoId', filtros.cursoId);
    if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
    return params;
  }
}
