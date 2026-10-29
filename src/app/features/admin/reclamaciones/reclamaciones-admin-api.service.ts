import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { PageResponse } from '../../../core/api/page-response.model';
import { ReclamacionBandeja, ReclamacionDetalle } from './reclamaciones-admin.model';

/** HU-040 — Consume `/api/admin/reclamaciones`. */
@Injectable({ providedIn: 'root' })
export class ReclamacionesAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/admin/reclamaciones`;

  bandeja(texto: string, estado: string, tipo: string, page: number, size: number): Observable<PageResponse<ReclamacionBandeja>> {
    const params = new HttpParams().set('texto', texto).set('estado', estado).set('tipo', tipo).set('page', page).set('size', size);
    return this.http.get<PageResponse<ReclamacionBandeja>>(this.url, { params });
  }

  detalle(id: number): Observable<ReclamacionDetalle> {
    return this.http.get<ReclamacionDetalle>(`${this.url}/${id}`);
  }

  /** La imagen es privada: se pide con la sesión y se muestra desde un blob. */
  adjunto(id: number, adjuntoId: number): Observable<Blob> {
    return this.http.get(`${this.url}/${id}/adjuntos/${adjuntoId}`, { responseType: 'blob' });
  }

  responder(id: number, respuesta: string): Observable<ReclamacionDetalle> {
    return this.http.post<ReclamacionDetalle>(`${this.url}/${id}/responder`, { respuesta });
  }

  reenviar(id: number, correo: string | null): Observable<ReclamacionDetalle> {
    return this.http.post<ReclamacionDetalle>(`${this.url}/${id}/reenviar`, { correo });
  }
}
