import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api/api.config';
import { PageResponse } from '../../core/api/page-response.model';
import { Matricula, MatriculaAdministrativa } from './matricula.model';

export interface CrearMatriculaAdministrativa {
  usuarioId: number; cursoId: number; condicionEconomica: 'REGISTRADO_MANUAL' | 'EXONERADO';
  importe: number | null; medio: string | null; referencia: string | null; motivo: string;
}
export interface ReporteMatricula { matriculaId: number; alumno: string; correo: string; curso: string; modalidad: string; fechaMatricula: string; fechaActivacion: string | null; estadoMatricula: string; formaIngreso: string; situacionAcademica: string; }

@Injectable({ providedIn: 'root' })
export class MatriculaApiService {
  private readonly http = inject(HttpClient);

  misCursos(): Observable<Matricula[]> {
    return this.http.get<Matricula[]>(`${API_URL}/app/matriculas`);
  }

  matricularGratis(cursoId: number): Observable<Matricula> {
    return this.http.post<Matricula>(`${API_URL}/cursos/${cursoId}/matricula-gratuita`, {});
  }

  listarAdministrativas(texto = '', estado = '', page = 0, size = 20): Observable<PageResponse<MatriculaAdministrativa>> {
    const params = new HttpParams().set('texto', texto).set('estado', estado).set('page', page).set('size', size);
    return this.http.get<PageResponse<MatriculaAdministrativa>>(`${API_URL}/admin/matriculas`, { params });
  }

  cancelar(id: number, motivo: string): Observable<Matricula> {
    return this.http.patch<Matricula>(`${API_URL}/admin/matriculas/${id}/cancelacion`, { motivo });
  }

  crearAdministrativa(peticion: CrearMatriculaAdministrativa): Observable<Matricula> {
    return this.http.post<Matricula>(`${API_URL}/admin/matriculas`, peticion);
  }
  reporte(texto = '', estado = '', page = 0, size = 20): Observable<PageResponse<ReporteMatricula>> {
    const params = new HttpParams().set('texto', texto).set('estado', estado).set('page', page).set('size', size);
    return this.http.get<PageResponse<ReporteMatricula>>(`${API_URL}/admin/reportes/matriculas`, { params });
  }
  urlExportacion(texto = '', estado = ''): string { return `${API_URL}/admin/reportes/matriculas/exportar?texto=${encodeURIComponent(texto)}&estado=${encodeURIComponent(estado)}`; }
  urlExportacionPdf(texto = '', estado = ''): string { return `${API_URL}/admin/reportes/matriculas/exportar-pdf?texto=${encodeURIComponent(texto)}&estado=${encodeURIComponent(estado)}`; }
  urlExportacionExcel(texto = '', estado = ''): string { return `${API_URL}/admin/reportes/matriculas/exportar-excel?texto=${encodeURIComponent(texto)}&estado=${encodeURIComponent(estado)}`; }
}
