import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import {
  ActualizarDatosPersonalesPeticion,
  CambiarActivoPeticion,
  ConcederRolPeticion,
  CrearUsuarioAdminPeticion,
  CrearUsuarioAdminRespuesta,
  PageResponse,
  ResetearContrasenaRespuesta,
  RolUsuarioAdmin,
  UsuarioAdminRespuesta,
} from './usuario-admin.model';

/** HU-008 — Gestionar usuarios administrativamente. Consume `/api/admin/usuarios`, respaldado por
 * base de datos real y protegido por sesión + rol ADMINISTRADOR. */
@Injectable({ providedIn: 'root' })
export class AdminUsuariosApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/admin/usuarios`;

  listar(
    texto: string,
    rol: RolUsuarioAdmin | 'TODOS',
    activo: boolean | 'TODOS',
    page: number,
    size: number,
  ): Observable<PageResponse<UsuarioAdminRespuesta>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (texto.trim()) {
      params = params.set('texto', texto.trim());
    }
    if (rol !== 'TODOS') {
      params = params.set('rol', rol);
    }
    if (activo !== 'TODOS') {
      params = params.set('activo', activo);
    }
    return this.http.get<PageResponse<UsuarioAdminRespuesta>>(this.url, { params });
  }

  obtener(usuarioId: number): Observable<UsuarioAdminRespuesta> {
    return this.http.get<UsuarioAdminRespuesta>(`${this.url}/${usuarioId}`);
  }

  actualizarDatosPersonales(
    usuarioId: number,
    peticion: ActualizarDatosPersonalesPeticion,
  ): Observable<UsuarioAdminRespuesta> {
    return this.http.put<UsuarioAdminRespuesta>(`${this.url}/${usuarioId}/datos-personales`, peticion);
  }

  crear(peticion: CrearUsuarioAdminPeticion): Observable<CrearUsuarioAdminRespuesta> {
    return this.http.post<CrearUsuarioAdminRespuesta>(this.url, peticion);
  }

  concederRol(usuarioId: number, peticion: ConcederRolPeticion): Observable<UsuarioAdminRespuesta> {
    return this.http.post<UsuarioAdminRespuesta>(`${this.url}/${usuarioId}/roles`, peticion);
  }

  /** Desviación deliberada de HU-008 (que dice que un rol no se retira), pedida explícitamente. */
  revocarRol(usuarioId: number, rol: RolUsuarioAdmin): Observable<UsuarioAdminRespuesta> {
    return this.http.delete<UsuarioAdminRespuesta>(`${this.url}/${usuarioId}/roles/${rol}`);
  }

  cambiarActivo(usuarioId: number, peticion: CambiarActivoPeticion): Observable<UsuarioAdminRespuesta> {
    return this.http.patch<UsuarioAdminRespuesta>(`${this.url}/${usuarioId}/activo`, peticion);
  }

  reenviarHabilitacion(usuarioId: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${usuarioId}/reenviar-habilitacion`, {});
  }

  resetearContrasena(usuarioId: number): Observable<ResetearContrasenaRespuesta> {
    return this.http.post<ResetearContrasenaRespuesta>(`${this.url}/${usuarioId}/resetear-contrasena`, {});
  }
}
