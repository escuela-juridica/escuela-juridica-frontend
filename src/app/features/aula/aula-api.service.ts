import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api/api.config';
import { AulaRespuesta } from './aula.model';

/** HU-022 — Ingresar y continuar un curso. Consume `GET /api/aula/cursos/{cursoId}`. */
@Injectable({ providedIn: 'root' })
export class AulaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/aula`;

  temario(cursoId: number): Observable<AulaRespuesta> {
    return this.http.get<AulaRespuesta>(`${this.base}/cursos/${cursoId}`);
  }
}
