import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api/api.config';
import { AdvertenciaMatricula, Matricula } from './matricula.model';

export interface CrearMatriculaAdministrativa {
  usuarioId: number; cursoId: number; condicionEconomica: 'REGISTRADO_MANUAL' | 'EXONERADO';
  importe: number | null; medio: string | null; referencia: string | null; motivo: string;
  confirmoAdvertenciaAcademica: boolean;
}
export interface ReporteMatricula { matriculaId: number; alumno: string; correo: string; curso: string; modalidad: string; fechaMatricula: string; fechaActivacion: string | null; estadoMatricula: string; formaIngreso: string; situacionAcademica: string; estadoCertificado: string; }
export interface FiltrosReporteMatricula { texto?: string; estado?: string; cursoId?: number | null; modalidad?: string; fechaDesde?: string; fechaHasta?: string; }

@Injectable({ providedIn: 'root' })
export class MatriculaApiService {
  private readonly http = inject(HttpClient);

  misCursos(): Observable<Matricula[]> {
    return this.http.get<Matricula[]>(`${API_URL}/app/matriculas`);
  }

  matricularGratis(cursoId: number): Observable<Matricula> {
    return this.http.post<Matricula>(`${API_URL}/cursos/${cursoId}/matricula-gratuita`, {});
  }

  // HU-020 (listarAdministrativas, detalleAdministrativo, cancelar) se retiró deliberadamente —
  // ver docs/epica-4/HU-020-MAPA-TECNICO-CONTROL-MATRICULAS.md en el backend para reconstruirla.

  crearAdministrativa(peticion: CrearMatriculaAdministrativa): Observable<Matricula> {
    return this.http.post<Matricula>(`${API_URL}/admin/matriculas`, peticion);
  }
  advertenciaAcademica(cursoId: number): Observable<AdvertenciaMatricula> {
    return this.http.get<AdvertenciaMatricula>(`${API_URL}/admin/cursos/${cursoId}/matriculas/advertencia-academica`);
  }
  reenviarConfirmacion(id: number): Observable<{ enviado: boolean; mensaje: string }> {
    return this.http.post<{ enviado: boolean; mensaje: string }>(`${API_URL}/matriculas/${id}/reenviar-confirmacion`, {});
  }

  // HU-041 (reporte, urlExportacion, urlExportacionPdf, urlExportacionExcel, y los helpers
  // privados parametrosReporte/url) se retiró deliberadamente — ver
  // docs/epica-4/HU-041-MAPA-TECNICO-REPORTE-MATRICULAS.md (en el backend) para reconstruirla.
}
