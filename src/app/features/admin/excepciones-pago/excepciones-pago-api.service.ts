import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { PageResponse } from '../../../core/api/page-response.model';
import { Excepcion } from './excepciones-pago.model';

/** HU-037 — Consume `/api/admin/atenciones-pago`. */
@Injectable({ providedIn: 'root' })
export class ExcepcionesPagoApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/admin/atenciones-pago`;

  listar(texto: string, estado: string, tipo: string, page: number, size: number): Observable<PageResponse<Excepcion>> {
    const params = new HttpParams().set('texto', texto).set('estado', estado).set('tipo', tipo).set('page', page).set('size', size);
    return this.http.get<PageResponse<Excepcion>>(this.url, { params });
  }

  detalle(id: number): Observable<Excepcion> {
    return this.http.get<Excepcion>(`${this.url}/${id}`);
  }

  atender(id: number, resultado: string): Observable<Excepcion> {
    return this.http.post<Excepcion>(`${this.url}/${id}/atender`, { resultado });
  }
}
