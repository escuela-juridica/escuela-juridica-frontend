import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { PageResponse } from '../../../core/api/page-response.model';
import {
  AnularCertificado,
  CertificadoDetalle,
  CertificadoGestion,
  CorregirCertificado,
  EmisionManualSituacion,
  EmitirCertificadoManual,
  FiltrosGestion,
  VistaPreviaCertificado,
} from './certificados-admin.model';

@Injectable({ providedIn: 'root' })
export class CertificadosAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/admin/certificados`;

  listar(filtros: FiltrosGestion, page: number, size: number): Observable<PageResponse<CertificadoGestion>> {
    let params = new HttpParams().set('estado', filtros.estado).set('page', page).set('size', size);
    if (filtros.usuarioId) params = params.set('usuarioId', filtros.usuarioId);
    if (filtros.cursoId) params = params.set('cursoId', filtros.cursoId);
    return this.http.get<PageResponse<CertificadoGestion>>(`${this.url}/gestion`, { params });
  }

  situacion(matriculaId: number): Observable<EmisionManualSituacion> {
    return this.http.get<EmisionManualSituacion>(`${this.url}/manual/${matriculaId}`);
  }

  emitir(matriculaId: number, datos: EmitirCertificadoManual): Observable<EmisionManualSituacion> {
    return this.http.post<EmisionManualSituacion>(`${this.url}/manual/${matriculaId}`, datos);
  }

  detalle(certificadoId: number): Observable<CertificadoDetalle> {
    return this.http.get<CertificadoDetalle>(`${this.url}/${certificadoId}`);
  }

  corregir(certificadoId: number, datos: CorregirCertificado): Observable<CertificadoDetalle> {
    return this.http.post<CertificadoDetalle>(`${this.url}/${certificadoId}/corregir`, datos);
  }

  anular(certificadoId: number, datos: AnularCertificado): Observable<CertificadoDetalle> {
    return this.http.post<CertificadoDetalle>(`${this.url}/${certificadoId}/anular`, datos);
  }

  vistaPrevia(certificadoId: number, datos: VistaPreviaCertificado): Observable<Blob> {
    return this.http.post(`${this.url}/${certificadoId}/vista-previa`, datos, { responseType: 'blob' });
  }
}
