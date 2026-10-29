import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../../core/api/api.config';
import {
  ActualizarMaterialPeticion,
  ActualizarSesionPeticion,
  AsistenciaSesionRespuesta,
  CancelarSesionPeticion,
  CorregirAsistenciaPeticion,
  CorregirEnlaceSesionPeticion,
  CrearLeccionPeticion,
  CrearMaterialEnlacePeticion,
  CrearModuloPeticion,
  HistorialSesionRespuesta,
  LeccionRespuesta,
  MaterialRespuesta,
  ModuloDisponibleRespuesta,
  ModuloRespuesta,
  OrdenPeticion,
  ReprogramarSesionPeticion,
  ReprogramarSesionRespuesta,
} from './contenido.model';

/** HU-011 — Organizar el contenido de un curso. Consume `/api/admin/.../modulos|lecciones|materiales`. */
@Injectable({ providedIn: 'root' })
export class ContenidoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/admin`;

  obtenerEstructura(cursoId: number): Observable<ModuloRespuesta[]> {
    return this.http.get<ModuloRespuesta[]>(`${this.base}/cursos/${cursoId}/modulos`);
  }

  listarModulosDisponibles(texto: string, excluirCursoId: number): Observable<ModuloDisponibleRespuesta[]> {
    const params = new HttpParams().set('texto', texto.trim()).set('excluirCursoId', excluirCursoId);
    return this.http.get<ModuloDisponibleRespuesta[]>(`${this.base}/modulos-disponibles`, { params });
  }

  crearModulo(cursoId: number, p: CrearModuloPeticion): Observable<ModuloRespuesta> {
    return this.http.post<ModuloRespuesta>(`${this.base}/cursos/${cursoId}/modulos`, p);
  }

  copiarModulo(cursoId: number, moduloOrigenId: number): Observable<ModuloRespuesta> {
    return this.http.post<ModuloRespuesta>(`${this.base}/cursos/${cursoId}/copias-modulo/${moduloOrigenId}`, {});
  }

  reordenarModulos(cursoId: number, p: OrdenPeticion): Observable<ModuloRespuesta[]> {
    return this.http.put<ModuloRespuesta[]>(`${this.base}/cursos/${cursoId}/modulos/orden`, p);
  }

  actualizarModulo(moduloId: number, p: CrearModuloPeticion): Observable<ModuloRespuesta> {
    return this.http.put<ModuloRespuesta>(`${this.base}/modulos/${moduloId}`, p);
  }

  cambiarActivoModulo(moduloId: number, activo: boolean): Observable<ModuloRespuesta> {
    return this.http.patch<ModuloRespuesta>(`${this.base}/modulos/${moduloId}/activo`, { activo });
  }

  eliminarModulo(moduloId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/modulos/${moduloId}`);
  }

  crearLeccion(moduloId: number, p: CrearLeccionPeticion): Observable<LeccionRespuesta> {
    return this.http.post<LeccionRespuesta>(`${this.base}/modulos/${moduloId}/lecciones`, p);
  }

  reordenarLecciones(moduloId: number, p: OrdenPeticion): Observable<LeccionRespuesta[]> {
    return this.http.put<LeccionRespuesta[]>(`${this.base}/modulos/${moduloId}/lecciones/orden`, p);
  }

  actualizarLeccion(leccionId: number, p: CrearLeccionPeticion): Observable<LeccionRespuesta> {
    return this.http.put<LeccionRespuesta>(`${this.base}/lecciones/${leccionId}`, p);
  }

  cambiarActivoLeccion(leccionId: number, activo: boolean): Observable<LeccionRespuesta> {
    return this.http.patch<LeccionRespuesta>(`${this.base}/lecciones/${leccionId}/activo`, { activo });
  }

  eliminarLeccion(leccionId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/lecciones/${leccionId}`);
  }

  actualizarSesion(leccionId: number, p: ActualizarSesionPeticion): Observable<LeccionRespuesta> {
    return this.http.put<LeccionRespuesta>(`${this.base}/lecciones/${leccionId}/sesion`, p);
  }

  crearMaterialEnlace(leccionId: number, p: CrearMaterialEnlacePeticion): Observable<MaterialRespuesta> {
    return this.http.post<MaterialRespuesta>(`${this.base}/lecciones/${leccionId}/materiales`, p);
  }

  subirMaterialArchivo(
    leccionId: number,
    archivo: File,
    titulo: string,
    tipoMaterialId: number,
    permiteDescarga: boolean,
  ): Observable<MaterialRespuesta> {
    const datos = new FormData();
    datos.set('archivo', archivo);
    datos.set('titulo', titulo);
    datos.set('tipoMaterialId', String(tipoMaterialId));
    datos.set('permiteDescarga', String(permiteDescarga));
    return this.http.post<MaterialRespuesta>(`${this.base}/lecciones/${leccionId}/materiales/archivo`, datos);
  }

  reordenarMateriales(leccionId: number, p: OrdenPeticion): Observable<MaterialRespuesta[]> {
    return this.http.put<MaterialRespuesta[]>(`${this.base}/lecciones/${leccionId}/materiales/orden`, p);
  }

  actualizarMaterial(materialId: number, p: ActualizarMaterialPeticion): Observable<MaterialRespuesta> {
    return this.http.patch<MaterialRespuesta>(`${this.base}/materiales/${materialId}`, p);
  }

  cambiarActivoMaterial(materialId: number, activo: boolean): Observable<MaterialRespuesta> {
    return this.http.patch<MaterialRespuesta>(`${this.base}/materiales/${materialId}/activo`, { activo });
  }

  eliminarMaterial(materialId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/materiales/${materialId}`);
  }

  // ---------------------------------------------------------------- HU-027 Cambios en sesiones --

  reprogramarSesion(leccionId: number, p: ReprogramarSesionPeticion): Observable<ReprogramarSesionRespuesta> {
    return this.http.patch<ReprogramarSesionRespuesta>(`${this.base}/lecciones/${leccionId}/sesion/reprogramar`, p);
  }

  ampliarFinDeCurso(cursoId: number, nuevaFechaFin: string): Observable<void> {
    const params = new HttpParams().set('nuevaFechaFin', nuevaFechaFin);
    return this.http.patch<void>(`${this.base}/cursos/${cursoId}/fecha-fin`, {}, { params });
  }

  cancelarSesion(leccionId: number, p: CancelarSesionPeticion): Observable<void> {
    return this.http.patch<void>(`${this.base}/lecciones/${leccionId}/sesion/cancelar`, p);
  }

  corregirEnlaceSesion(leccionId: number, p: CorregirEnlaceSesionPeticion): Observable<void> {
    return this.http.patch<void>(`${this.base}/lecciones/${leccionId}/sesion/enlace`, p);
  }

  listarAsistenciasSesion(leccionId: number): Observable<AsistenciaSesionRespuesta[]> {
    return this.http.get<AsistenciaSesionRespuesta[]>(`${this.base}/lecciones/${leccionId}/sesion/asistencias`);
  }

  corregirAsistencia(asistenciaId: number, p: CorregirAsistenciaPeticion): Observable<void> {
    return this.http.patch<void>(`${this.base}/asistencias/${asistenciaId}`, p);
  }

  historialSesion(leccionId: number): Observable<HistorialSesionRespuesta[]> {
    return this.http.get<HistorialSesionRespuesta[]>(`${this.base}/lecciones/${leccionId}/sesion/historial`);
  }
}
