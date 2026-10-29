import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { UsuarioSesion } from '../../../core/session/session';

export interface AccesoPeticion {
  correo: string;
  contrasena: string;
}

@Injectable({ providedIn: 'root' })
export class AccesoApiService {
  private readonly http = inject(HttpClient);
  private readonly urlAuth = `${API_URL}/auth`;

  acceder(peticion: AccesoPeticion): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.urlAuth}/acceso`, peticion);
  }

  sesion(): Observable<UsuarioSesion> {
    return this.http.get<UsuarioSesion>(`${this.urlAuth}/sesion`);
  }

  cerrar(): Observable<void> {
    return this.http.post<void>(`${this.urlAuth}/cierre`, {});
  }
}
