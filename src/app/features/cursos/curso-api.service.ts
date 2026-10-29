import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api/api.config';
import { PageResponse } from '../../core/api/page-response.model';
import {
  CriteriosCatalogo,
  CursoTarjeta,
  FichaCursoDetalle,
  FiltrosCurso,
  VistaPrevia,
} from './curso.model';

@Injectable({ providedIn: 'root' })
export class CursoApiService {
  private readonly http = inject(HttpClient);

  listar(criterios: CriteriosCatalogo): Observable<PageResponse<CursoTarjeta>> {
    let params = new HttpParams()
      .set('pagina', criterios.pagina)
      .set('tamano', criterios.tamano);

    if (criterios.texto) {
      params = params.set('texto', criterios.texto);
    }
    if (criterios.tipo) {
      params = params.set('tipo', criterios.tipo);
    }
    if (criterios.categoria) {
      params = params.set('categoria', criterios.categoria);
    }

    return this.http.get<PageResponse<CursoTarjeta>>(`${API_URL}/publico/cursos`, { params });
  }

  filtros(): Observable<FiltrosCurso> {
    return this.http.get<FiltrosCurso>(`${API_URL}/publico/cursos/filtros`);
  }

  detalle(urlAmigable: string): Observable<FichaCursoDetalle> {
    return this.http.get<FichaCursoDetalle>(`${API_URL}/publico/cursos/${urlAmigable}`);
  }

  vistaPrevia(urlAmigable: string, leccionId: number): Observable<VistaPrevia> {
    return this.http.get<VistaPrevia>(
      `${API_URL}/publico/cursos/${urlAmigable}/lecciones/${leccionId}/vista-previa`,
    );
  }
}
