import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { Dashboard, FiltrosDashboard } from './dashboard.model';

/** HU-046 — Consume `/api/admin/dashboard`. */
@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);

  consultar(filtros: FiltrosDashboard): Observable<Dashboard> {
    let params = new HttpParams().set('modalidad', filtros.modalidad ?? '');
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.cursoId) params = params.set('cursoId', filtros.cursoId);
    return this.http.get<Dashboard>(`${API_URL}/admin/dashboard`, { params });
  }
}
