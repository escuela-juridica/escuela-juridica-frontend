import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/api/api.config';

import {
  ContextoRegistroGoogle,
  GoogleRegistroSesion,
  RegistroFormularioPeticion,
  RegistroFormularioRespuesta,
  RegistroGooglePeticion,
} from './registro.models';

@Injectable({ providedIn: 'root' })
export class RegistroApiService {
  private readonly http = inject(HttpClient);
  private readonly urlRegistro = `${API_URL}/auth/registro`;

  registrarFormulario(
    peticion: RegistroFormularioPeticion,
  ): Observable<RegistroFormularioRespuesta> {
    return this.http.post<RegistroFormularioRespuesta>(this.urlRegistro, peticion);
  }

  obtenerContextoGoogle(referencia: string): Observable<ContextoRegistroGoogle> {
    const referenciaSegura = encodeURIComponent(referencia);
    return this.http.get<ContextoRegistroGoogle>(`${this.urlRegistro}/google/${referenciaSegura}`);
  }

  completarRegistroGoogle(peticion: RegistroGooglePeticion): Observable<GoogleRegistroSesion> {
    return this.http.post<GoogleRegistroSesion>(`${this.urlRegistro}/google`, peticion);
  }
}
