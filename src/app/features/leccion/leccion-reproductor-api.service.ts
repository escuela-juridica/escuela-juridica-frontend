import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api/api.config';
import { MaterialAlumnoRespuesta, ProgresoVideoPeticion } from './material-alumno.model';

@Injectable({ providedIn: 'root' })
export class LeccionReproductorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/app`;

  listarMateriales(leccionId: number): Observable<MaterialAlumnoRespuesta[]> {
    return this.http.get<MaterialAlumnoRespuesta[]>(`${this.base}/lecciones/${leccionId}/materiales`);
  }

  registrarProgresoVideo(materialId: number, peticion: ProgresoVideoPeticion): Observable<void> {
    return this.http.post<void>(`${this.base}/materiales/${materialId}/progreso-video`, peticion);
  }

  completarLeccion(leccionId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/lecciones/${leccionId}/completar`, {});
  }
}
