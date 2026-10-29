import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { PageResponse } from '../../../core/api/page-response.model';
import {
  ActualizarInformacionCursoPeticion,
  AsignarDocentesPeticion,
  AsignarFirmantesPeticion,
  ActualizarReglasCursoPeticion,
  CambiarDestacadoPeticion,
  CancelacionAfectado,
  CancelacionCurso,
  CancelarCursoPeticion,
  CerrarCursoPeticion,
  CrearCursoPeticion,
  CursoEditorRespuesta,
  CursoResumenRespuesta,
  ReglasCursoRespuesta,
  RetrasarInicioPeticion,
  ValidacionPublicacionRespuesta,
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

  obtenerReglas(cursoId: number): Observable<ReglasCursoRespuesta> {
    return this.http.get<ReglasCursoRespuesta>(`${this.url}/${cursoId}/reglas`);
  }

  actualizarReglas(cursoId: number, peticion: ActualizarReglasCursoPeticion): Observable<ReglasCursoRespuesta> {
    return this.http.put<ReglasCursoRespuesta>(`${this.url}/${cursoId}/reglas`, peticion);
  }

  sugerirBeneficios(texto: string): Observable<string[]> {
    const params = new HttpParams().set('texto', texto.trim());
    return this.http.get<string[]>(`${this.url}/beneficios-sugeridos`, { params });
  }

  validarPublicacion(cursoId: number): Observable<ValidacionPublicacionRespuesta> {
    return this.http.get<ValidacionPublicacionRespuesta>(`${this.url}/${cursoId}/validacion`);
  }

  publicar(cursoId: number): Observable<ValidacionPublicacionRespuesta> {
    return this.http.post<ValidacionPublicacionRespuesta>(`${this.url}/${cursoId}/publicacion`, {});
  }

  adelantarInicio(cursoId: number): Observable<CursoEditorRespuesta> {
    return this.http.post<CursoEditorRespuesta>(`${this.url}/${cursoId}/adelantar-inicio`, {});
  }

  retrasarInicio(cursoId: number, peticion: RetrasarInicioPeticion): Observable<CursoEditorRespuesta> {
    return this.http.post<CursoEditorRespuesta>(`${this.url}/${cursoId}/retrasar-inicio`, peticion);
  }

  cerrar(cursoId: number, peticion: CerrarCursoPeticion): Observable<CursoEditorRespuesta> {
    return this.http.post<CursoEditorRespuesta>(`${this.url}/${cursoId}/cerrar`, peticion);
  }

  cambiarDestacado(cursoId: number, peticion: CambiarDestacadoPeticion): Observable<CursoEditorRespuesta> {
    return this.http.patch<CursoEditorRespuesta>(`${this.url}/${cursoId}/destacado`, peticion);
  }

  duplicar(cursoId: number): Observable<CursoEditorRespuesta> {
    return this.http.post<CursoEditorRespuesta>(`${this.url}/${cursoId}/duplicar`, {});
  }

  eliminar(cursoId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${cursoId}`);
  }

  // ---------------------------------------------------------------- HU-038 --

  impactoCancelacion(cursoId: number): Observable<CancelacionCurso> {
    return this.http.get<CancelacionCurso>(`${this.url}/${cursoId}/cancelacion`);
  }

  cancelarCurso(cursoId: number, peticion: CancelarCursoPeticion): Observable<CancelacionCurso> {
    return this.http.post<CancelacionCurso>(`${this.url}/${cursoId}/cancelacion/cancelar`, peticion);
  }

  afectadosCancelacion(cursoId: number, page: number, size: number): Observable<PageResponse<CancelacionAfectado>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<CancelacionAfectado>>(`${this.url}/${cursoId}/cancelacion/afectados`, { params });
  }

  reenviarAvisosCancelacion(cursoId: number): Observable<CancelacionCurso> {
    return this.http.post<CancelacionCurso>(`${this.url}/${cursoId}/cancelacion/reenviar-avisos`, {});
  }
}
