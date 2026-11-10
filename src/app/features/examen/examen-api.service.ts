import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api/api.config';
import { ExamenFicha, GuardarRespuesta, Intento } from './examen.model';

@Injectable({ providedIn: 'root' })
export class ExamenApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/app`;

  ficha(examenId: number): Observable<ExamenFicha> {
    return this.http.get<ExamenFicha>(`${this.base}/examenes/${examenId}`);
  }

  iniciar(examenId: number): Observable<Intento> {
    return this.http.post<Intento>(`${this.base}/examenes/${examenId}/intentos`, {});
  }

  intento(intentoId: number): Observable<Intento> {
    return this.http.get<Intento>(`${this.base}/intentos/${intentoId}`);
  }

  guardarRespuesta(intentoId: number, preguntaId: number, respuesta: GuardarRespuesta): Observable<void> {
    return this.http.put<void>(`${this.base}/intentos/${intentoId}/respuestas/${preguntaId}`, respuesta);
  }

  enviar(intentoId: number): Observable<Intento> {
    return this.http.post<Intento>(`${this.base}/intentos/${intentoId}/enviar`, {});
  }
}
