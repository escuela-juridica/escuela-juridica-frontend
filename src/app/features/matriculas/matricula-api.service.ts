import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api/api.config';
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

  listarAdministrativas(texto = '', estado = ''): Observable<MatriculaAdministrativa[]> {
    return this.http.get<MatriculaAdministrativa[]>(`${API_URL}/admin/matriculas`, { params: { texto, estado } });
  }

  cancelar(id: number, motivo: string): Observable<Matricula> {
    return this.http.patch<Matricula>(`${API_URL}/admin/matriculas/${id}/cancelacion`, { motivo });
  }

  crearAdministrativa(peticion: CrearMatriculaAdministrativa): Observable<Matricula> {
    return this.http.post<Matricula>(`${API_URL}/admin/matriculas`, peticion);
  }
  reporte(texto = '', estado = ''): Observable<ReporteMatricula[]> { return this.http.get<ReporteMatricula[]>(`${API_URL}/admin/reportes/matriculas`, { params: { texto, estado } }); }
  urlExportacion(texto = '', estado = ''): string { return `${API_URL}/admin/reportes/matriculas/exportar?texto=${encodeURIComponent(texto)}&estado=${encodeURIComponent(estado)}`; }
}
