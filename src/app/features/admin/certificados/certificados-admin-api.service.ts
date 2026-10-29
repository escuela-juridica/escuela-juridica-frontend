import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { PageResponse } from '../../../core/api/page-response.model';
import { CertificadoGestion, EmisionManualSituacion, EmitirCertificadoManual } from './certificados-admin.model';

/** HU-035 — Consume `/api/admin/certificados`. */
@Injectable({ providedIn: 'root' })
export class CertificadosAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/admin/certificados`;

  listar(texto: string, estado: string, page: number, size: number): Observable<PageResponse<CertificadoGestion>> {
    const params = new HttpParams().set('texto', texto).set('estado', estado).set('page', page).set('size', size);
    return this.http.get<PageResponse<CertificadoGestion>>(`${this.url}/gestion`, { params });
  }

  situacion(matriculaId: number): Observable<EmisionManualSituacion> {
    return this.http.get<EmisionManualSituacion>(`${this.url}/manual/${matriculaId}`);
  }

  emitir(matriculaId: number, datos: EmitirCertificadoManual): Observable<EmisionManualSituacion> {
    return this.http.post<EmisionManualSituacion>(`${this.url}/manual/${matriculaId}`, datos);
  }
}
