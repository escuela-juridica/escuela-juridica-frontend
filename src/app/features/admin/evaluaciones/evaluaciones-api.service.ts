import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { PageResponse } from '../../../core/api/page-response.model';
import {
  FiltrosBandeja,
  IntentoPendiente,
  PuntajeRespuesta,
  ResumenBandeja,
  RevisionIntento,
} from './evaluaciones.model';

/** HU-030 — Consume `/api/admin/evaluaciones`. */
@Injectable({ providedIn: 'root' })
export class EvaluacionesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/admin/evaluaciones`;

  bandeja(filtros: FiltrosBandeja, page = 0, size = 20): Observable<PageResponse<IntentoPendiente>> {
    let params = new HttpParams().set('texto', filtros.texto ?? '').set('plazo', filtros.plazo ?? '')
      .set('page', page).set('size', size);
    if (filtros.cursoId) params = params.set('cursoId', filtros.cursoId);
    return this.http.get<PageResponse<IntentoPendiente>>(`${this.base}/pendientes`, { params });
  }

  resumen(): Observable<ResumenBandeja> {
    return this.http.get<ResumenBandeja>(`${this.base}/pendientes/resumen`);
  }

  intento(intentoId: number): Observable<RevisionIntento> {
    return this.http.get<RevisionIntento>(`${this.base}/intentos/${intentoId}`);
  }

  calificar(intentoId: number, respuestas: PuntajeRespuesta[]): Observable<RevisionIntento> {
    return this.http.post<RevisionIntento>(`${this.base}/intentos/${intentoId}/calificar`, { respuestas });
  }

  reenviarAviso(intentoId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/intentos/${intentoId}/reenviar-aviso`, {});
  }
}
