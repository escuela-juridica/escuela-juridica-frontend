import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_URL, resolverUrlApi } from '../../core/api/api.config';
import { PageResponse } from '../../core/api/page-response.model';
import { Certificacion, ConfirmarDatos, MiCertificado, VerificacionCertificado } from './certificacion.model';

@Injectable({ providedIn: 'root' })
export class CertificacionApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/app/cursos`;

  consultar(cursoId: number): Observable<Certificacion> {
    return this.http.get<Certificacion>(`${this.base}/${cursoId}/certificacion`);
  }

  confirmarDatos(cursoId: number, datos: ConfirmarDatos): Observable<Certificacion> {
    return this.http.put<Certificacion>(`${this.base}/${cursoId}/certificacion/datos`, datos);
  }

  emitir(cursoId: number): Observable<Certificacion> {
    return this.http.post<Certificacion>(`${this.base}/${cursoId}/certificacion/emitir`, {});
  }

  misCertificados(pagina: number, tamano: number): Observable<PageResponse<MiCertificado>> {
    const params = new HttpParams().set('page', pagina).set('size', tamano);
    return this.http.get<PageResponse<MiCertificado>>(`${API_URL}/app/certificados`, { params });
  }

  descargarPdf(descargaUrl: string, codigo: string): Observable<void> {
    return this.http.get(resolverUrlApi(descargaUrl), { responseType: 'blob' }).pipe(
      map((contenido) => {
        const url = URL.createObjectURL(contenido);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `certificado-${codigo}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
    );
  }

  verificar(codigo: string): Observable<VerificacionCertificado> {
    return this.http.get<VerificacionCertificado>(`${API_URL}/publico/certificados/${encodeURIComponent(codigo.trim())}`);
  }
}
