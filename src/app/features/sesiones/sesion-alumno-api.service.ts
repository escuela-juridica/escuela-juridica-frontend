import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api/api.config';
import { IngresarSesionRespuesta, SesionCalendarioRespuesta } from './sesion-alumno.model';

@Injectable({ providedIn: 'root' })
export class SesionAlumnoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/app`;

  calendario(desde?: string, hasta?: string): Observable<SesionCalendarioRespuesta[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<SesionCalendarioRespuesta[]>(`${this.base}/sesiones/calendario`, { params });
  }

  ingresar(leccionId: number): Observable<IngresarSesionRespuesta> {
    return this.http.post<IngresarSesionRespuesta>(`${this.base}/lecciones/${leccionId}/sesion/ingresar`, {});
  }
}
