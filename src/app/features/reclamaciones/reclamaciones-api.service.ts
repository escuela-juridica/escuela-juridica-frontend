import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api/api.config';
import { PresentarReclamacion, ReclamacionConstancia, ReclamacionPrecarga } from './reclamacion.model';

/** HU-039 — Consume el Libro de Reclamaciones: con sesión el caso queda ligado a la cuenta. */
@Injectable({ providedIn: 'root' })
export class ReclamacionesApiService {
  private readonly http = inject(HttpClient);

  precarga(): Observable<ReclamacionPrecarga> {
    return this.http.get<ReclamacionPrecarga>(`${API_URL}/app/reclamaciones/precarga`);
  }

  presentar(datos: PresentarReclamacion, imagenes: File[], conSesion: boolean): Observable<ReclamacionConstancia> {
    const cuerpo = new FormData();
    cuerpo.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }));
    for (const imagen of imagenes) {
      cuerpo.append('imagenes', imagen, imagen.name);
    }
    const ruta = conSesion ? 'app' : 'publico';
    return this.http.post<ReclamacionConstancia>(`${API_URL}/${ruta}/reclamaciones`, cuerpo);
  }
}
