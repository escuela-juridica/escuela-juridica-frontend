import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { PageResponse, RolUsuarioAdmin, UsuarioAdminRespuesta } from './usuario-admin.model';

/**
 * HU-008 — Gestionar usuarios administrativamente.
 *
 * Esta historia se reasignó como ejercicio técnico del equipo: la mayoría de los métodos de este
 * servicio se retiraron a propósito (ver
 * docs/epica-4/HU-008-MAPA-TECNICO-GESTIONAR-USUARIOS.md, que trae el código íntegro para
 * reconstruirlos).
 *
 * NO borrar esta clase ni el método `listar(...)`: HU-019 (matriculas-listado.ts, al matricular
 * administrativamente) sigue dependiendo de él para poblar el combo de alumnos. Revisa ese
 * consumidor antes de volver a tocar este archivo.
 */
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
}
