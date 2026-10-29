import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { RecuperacionSolicitadaRespuesta, SolicitarRecuperacionPeticion } from './recuperar-password.models';

@Injectable({ providedIn: 'root' })
export class RecuperarPasswordApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/auth/recuperacion`;

  solicitar(peticion: SolicitarRecuperacionPeticion): Observable<RecuperacionSolicitadaRespuesta> {
    return this.http.post<RecuperacionSolicitadaRespuesta>(this.url, peticion);
  }
}
