import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../../../core/api/api.config';
import { SeguimientoAcademicoDetalle } from './seguimiento-academico.model';

/** HU-031 — Consume `/api/admin/matriculas/{id}/academico`. */
@Injectable({ providedIn: 'root' })
export class SeguimientoAcademicoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/admin/matriculas`;

  consultar(matriculaId: number): Observable<SeguimientoAcademicoDetalle> {
    return this.http.get<SeguimientoAcademicoDetalle>(`${this.base}/${matriculaId}/academico`);
  }

  otorgarIntento(matriculaId: number, examenId: number, motivo: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${matriculaId}/academico/intentos-adicionales`, { examenId, motivo });
  }

  corregirAsistencia(matriculaId: number, asistenciaId: number, nuevoEstado: string, motivoCorreccion: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${matriculaId}/academico/asistencias/${asistenciaId}/correccion`, {
      nuevoEstado,
      motivoCorreccion,
    });
  }
}
