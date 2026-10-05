import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { PageResponse } from '../../../core/api/page-response.model';
import {
  ActualizarInformacionCursoPeticion,
  AsignarDocentesPeticion,
  AsignarFirmantesPeticion,
  CrearCursoPeticion,
  CursoEditorRespuesta,
  CursoResumenRespuesta,
} from './curso-admin.model';

/** HU-010 — Crear y configurar un curso. Consume `/api/admin/cursos`. */
@Injectable({ providedIn: 'root' })
export class CursoAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/admin/cursos`;

  listar(texto: string, page: number, size: number): Observable<PageResponse<CursoResumenRespuesta>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (texto.trim()) {
      params = params.set('texto', texto.trim());
    }
    return this.http.get<PageResponse<CursoResumenRespuesta>>(this.url, { params });
  }

  crear(peticion: CrearCursoPeticion): Observable<CursoEditorRespuesta> {
    return this.http.post<CursoEditorRespuesta>(this.url, peticion);
  }

  obtener(cursoId: number): Observable<CursoEditorRespuesta> {
    return this.http.get<CursoEditorRespuesta>(`${this.url}/${cursoId}`);
  }

  actualizarInformacion(
    cursoId: number,
    peticion: ActualizarInformacionCursoPeticion,
  ): Observable<CursoEditorRespuesta> {
    return this.http.put<CursoEditorRespuesta>(`${this.url}/${cursoId}/informacion`, peticion);
  }

  actualizarDocentes(cursoId: number, peticion: AsignarDocentesPeticion): Observable<CursoEditorRespuesta> {
    return this.http.put<CursoEditorRespuesta>(`${this.url}/${cursoId}/docentes`, peticion);
  }

  actualizarFirmantes(cursoId: number, peticion: AsignarFirmantesPeticion): Observable<CursoEditorRespuesta> {
    return this.http.put<CursoEditorRespuesta>(`${this.url}/${cursoId}/firmantes`, peticion);
  }

  sugerirBeneficios(texto: string): Observable<string[]> {
    const params = new HttpParams().set('texto', texto.trim());
    return this.http.get<string[]>(`${this.url}/beneficios-sugeridos`, { params });
  }
}
