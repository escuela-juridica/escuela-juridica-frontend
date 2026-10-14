import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import {
  ActualizarPerfilPeticion,
  CambiarContrasenaPeticion,
  NuevaContrasenaPeticion,
  PerfilRespuesta,
} from './perfil.models';

@Injectable({ providedIn: 'root' })
export class PerfilApiService {
  private readonly http = inject(HttpClient);
  private readonly urlPerfil = `${API_URL}/perfil`;

  obtener(): Observable<PerfilRespuesta> {
    return this.http.get<PerfilRespuesta>(this.urlPerfil);
  }

  actualizar(peticion: ActualizarPerfilPeticion): Observable<PerfilRespuesta> {
    return this.http.put<PerfilRespuesta>(this.urlPerfil, peticion);
  }

  crearContrasena(peticion: NuevaContrasenaPeticion): Observable<void> {
    return this.http.put<void>(`${this.urlPerfil}/contrasena`, peticion);
  }

  cambiarContrasena(peticion: CambiarContrasenaPeticion): Observable<void> {
    return this.http.put<void>(`${this.urlPerfil}/contrasena/cambio`, peticion);
  }
}
