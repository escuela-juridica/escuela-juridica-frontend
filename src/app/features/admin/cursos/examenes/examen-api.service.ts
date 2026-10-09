import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../../core/api/api.config';
import {
  CrearExamenPeticion,
  CrearPreguntaPeticion,
  ExamenRespuesta,
  OrdenPeticion,
  PreguntaRespuesta,
} from './examen.model';

/** HU-013 — Configurar exámenes. Consume `/api/admin/.../examenes|preguntas`. */
@Injectable({ providedIn: 'root' })
export class ExamenApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/admin`;

  listarPorCurso(cursoId: number): Observable<ExamenRespuesta[]> {
    return this.http.get<ExamenRespuesta[]>(`${this.base}/cursos/${cursoId}/examenes`);
  }

  crearExamen(cursoId: number, p: CrearExamenPeticion): Observable<ExamenRespuesta> {
    return this.http.post<ExamenRespuesta>(`${this.base}/cursos/${cursoId}/examenes`, p);
  }

  actualizarExamen(examenId: number, p: CrearExamenPeticion): Observable<ExamenRespuesta> {
    return this.http.put<ExamenRespuesta>(`${this.base}/examenes/${examenId}`, p);
  }

  cambiarActivoExamen(examenId: number, activo: boolean): Observable<ExamenRespuesta> {
    return this.http.patch<ExamenRespuesta>(`${this.base}/examenes/${examenId}/activo`, { activo });
  }

  eliminarExamen(examenId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/examenes/${examenId}`);
  }

  reordenarExamenes(cursoId: number, p: OrdenPeticion): Observable<ExamenRespuesta[]> {
    return this.http.put<ExamenRespuesta[]>(`${this.base}/cursos/${cursoId}/examenes/orden`, p);
  }

  crearPregunta(examenId: number, p: CrearPreguntaPeticion): Observable<PreguntaRespuesta> {
    return this.http.post<PreguntaRespuesta>(`${this.base}/examenes/${examenId}/preguntas`, p);
  }

  actualizarPregunta(preguntaId: number, p: CrearPreguntaPeticion): Observable<PreguntaRespuesta> {
    return this.http.put<PreguntaRespuesta>(`${this.base}/preguntas/${preguntaId}`, p);
  }

  cambiarActivoPregunta(preguntaId: number, activo: boolean): Observable<PreguntaRespuesta> {
    return this.http.patch<PreguntaRespuesta>(`${this.base}/preguntas/${preguntaId}/activo`, { activo });
  }

  eliminarPregunta(preguntaId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/preguntas/${preguntaId}`);
  }

  reordenarPreguntas(examenId: number, p: OrdenPeticion): Observable<PreguntaRespuesta[]> {
    return this.http.put<PreguntaRespuesta[]>(`${this.base}/examenes/${examenId}/preguntas/orden`, p);
  }
}
