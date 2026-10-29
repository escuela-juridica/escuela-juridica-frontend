import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { NuevaContrasenaPeticion, TokenRecuperacionRespuesta } from './nueva-password.models';

@Injectable({ providedIn: 'root' })
export class NuevaPasswordApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/auth/recuperacion`;

  consultar(token: string): Observable<TokenRecuperacionRespuesta> {
    return this.http.get<TokenRecuperacionRespuesta>(`${this.url}/${encodeURIComponent(token)}`);
  }

  cambiar(token: string, peticion: NuevaContrasenaPeticion): Observable<void> {
    return this.http.post<void>(`${this.url}/${encodeURIComponent(token)}`, peticion);
  }
}
