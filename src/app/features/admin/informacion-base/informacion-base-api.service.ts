import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { PageResponse } from '../../../core/api/page-response.model';
import {
  CategoriaPeticion,
  CategoriaRespuesta,
  DocentePeticion,
  DocenteRespuesta,
  EntidadPeticion,
  EntidadRespuesta,
  FirmantePeticion,
  FirmanteRespuesta,
  TipoCursoPeticion,
  TipoCursoRespuesta,
  TipoMaterialPeticion,
  TipoMaterialRespuesta,
} from './informacion-base.model';

/** HU-009 — Administrar información base: datos maestros reutilizados al crear o editar un curso. */
@Injectable({ providedIn: 'root' })
export class InformacionBaseApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/admin/informacion-base`;

  private params(incluirInactivos: boolean, page: number, size: number): HttpParams {
    return new HttpParams()
      .set('incluirInactivos', incluirInactivos)
      .set('page', page)
      .set('size', size);
  }

  // Tipos de curso
  listarTiposCurso(incluirInactivos: boolean, page: number, size: number): Observable<PageResponse<TipoCursoRespuesta>> {
    return this.http.get<PageResponse<TipoCursoRespuesta>>(`${this.url}/tipos-curso`, {
      params: this.params(incluirInactivos, page, size),
    });
  }
  crearTipoCurso(p: TipoCursoPeticion): Observable<TipoCursoRespuesta> {
    return this.http.post<TipoCursoRespuesta>(`${this.url}/tipos-curso`, p);
  }
  actualizarTipoCurso(id: number, p: TipoCursoPeticion): Observable<TipoCursoRespuesta> {
    return this.http.put<TipoCursoRespuesta>(`${this.url}/tipos-curso/${id}`, p);
  }
  cambiarActivoTipoCurso(id: number, activo: boolean): Observable<TipoCursoRespuesta> {
    return this.http.patch<TipoCursoRespuesta>(`${this.url}/tipos-curso/${id}/activo`, { activo });
  }

  // Categorías
  listarCategorias(incluirInactivos: boolean, page: number, size: number): Observable<PageResponse<CategoriaRespuesta>> {
    return this.http.get<PageResponse<CategoriaRespuesta>>(`${this.url}/categorias`, {
      params: this.params(incluirInactivos, page, size),
    });
  }
  crearCategoria(p: CategoriaPeticion): Observable<CategoriaRespuesta> {
    return this.http.post<CategoriaRespuesta>(`${this.url}/categorias`, p);
  }
  actualizarCategoria(id: number, p: CategoriaPeticion): Observable<CategoriaRespuesta> {
    return this.http.put<CategoriaRespuesta>(`${this.url}/categorias/${id}`, p);
  }
  cambiarActivoCategoria(id: number, activo: boolean): Observable<CategoriaRespuesta> {
    return this.http.patch<CategoriaRespuesta>(`${this.url}/categorias/${id}/activo`, { activo });
  }

  // Docentes
  listarDocentes(incluirInactivos: boolean, page: number, size: number): Observable<PageResponse<DocenteRespuesta>> {
    return this.http.get<PageResponse<DocenteRespuesta>>(`${this.url}/docentes`, {
      params: this.params(incluirInactivos, page, size),
    });
  }
  crearDocente(p: DocentePeticion): Observable<DocenteRespuesta> {
    return this.http.post<DocenteRespuesta>(`${this.url}/docentes`, p);
  }
  actualizarDocente(id: number, p: DocentePeticion): Observable<DocenteRespuesta> {
    return this.http.put<DocenteRespuesta>(`${this.url}/docentes/${id}`, p);
  }
  cambiarActivoDocente(id: number, activo: boolean): Observable<DocenteRespuesta> {
    return this.http.patch<DocenteRespuesta>(`${this.url}/docentes/${id}/activo`, { activo });
  }

  // Entidades certificadoras
  listarEntidades(incluirInactivos: boolean, page: number, size: number): Observable<PageResponse<EntidadRespuesta>> {
    return this.http.get<PageResponse<EntidadRespuesta>>(`${this.url}/entidades`, {
      params: this.params(incluirInactivos, page, size),
    });
  }
  crearEntidad(p: EntidadPeticion): Observable<EntidadRespuesta> {
    return this.http.post<EntidadRespuesta>(`${this.url}/entidades`, p);
  }
  actualizarEntidad(id: number, p: EntidadPeticion): Observable<EntidadRespuesta> {
    return this.http.put<EntidadRespuesta>(`${this.url}/entidades/${id}`, p);
  }
  cambiarActivoEntidad(id: number, activo: boolean): Observable<EntidadRespuesta> {
    return this.http.patch<EntidadRespuesta>(`${this.url}/entidades/${id}/activo`, { activo });
  }

  // Firmantes
  listarFirmantes(incluirInactivos: boolean, page: number, size: number): Observable<PageResponse<FirmanteRespuesta>> {
    return this.http.get<PageResponse<FirmanteRespuesta>>(`${this.url}/firmantes`, {
      params: this.params(incluirInactivos, page, size),
    });
  }
  crearFirmante(p: FirmantePeticion): Observable<FirmanteRespuesta> {
    return this.http.post<FirmanteRespuesta>(`${this.url}/firmantes`, p);
  }
  actualizarFirmante(id: number, p: FirmantePeticion): Observable<FirmanteRespuesta> {
    return this.http.put<FirmanteRespuesta>(`${this.url}/firmantes/${id}`, p);
  }
  cambiarActivoFirmante(id: number, activo: boolean): Observable<FirmanteRespuesta> {
    return this.http.patch<FirmanteRespuesta>(`${this.url}/firmantes/${id}/activo`, { activo });
  }

  // Tipos de material
  listarTiposMaterial(
    incluirInactivos: boolean,
    page: number,
    size: number,
  ): Observable<PageResponse<TipoMaterialRespuesta>> {
    return this.http.get<PageResponse<TipoMaterialRespuesta>>(`${this.url}/tipos-material`, {
      params: this.params(incluirInactivos, page, size),
    });
  }
  crearTipoMaterial(p: TipoMaterialPeticion): Observable<TipoMaterialRespuesta> {
    return this.http.post<TipoMaterialRespuesta>(`${this.url}/tipos-material`, p);
  }
  actualizarTipoMaterial(id: number, p: TipoMaterialPeticion): Observable<TipoMaterialRespuesta> {
    return this.http.put<TipoMaterialRespuesta>(`${this.url}/tipos-material/${id}`, p);
  }
  cambiarActivoTipoMaterial(id: number, activo: boolean): Observable<TipoMaterialRespuesta> {
    return this.http.patch<TipoMaterialRespuesta>(`${this.url}/tipos-material/${id}/activo`, { activo });
  }
}
