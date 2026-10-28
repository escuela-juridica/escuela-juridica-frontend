import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api/api.config';
import { Certificacion, ConfirmarDatos } from './certificacion.model';

/** HU-032 — Consume `/api/app/cursos/{cursoId}/certificacion`. */
@Injectable({ providedIn: 'root' })
export class CertificacionApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/app/cursos`;

  consultar(cursoId: number): Observable<Certificacion> {
    return this.http.get<Certificacion>(`${this.base}/${cursoId}/certificacion`);
  }

  confirmarDatos(cursoId: number, datos: ConfirmarDatos): Observable<Certificacion> {
    return this.http.put<Certificacion>(`${this.base}/${cursoId}/certificacion/datos`, datos);
  }

  emitir(cursoId: number): Observable<Certificacion> {
    return this.http.post<Certificacion>(`${this.base}/${cursoId}/certificacion/emitir`, {});
  }
}
