import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/api/api.config';
import {
  ContextoVerificacionRespuesta,
  ReenviarCodigoPeticion,
  ReenvioCorreoRespuesta,
  VerificarCorreoPeticion,
  VerificarCorreoRespuesta,
} from './verificar-correo.models';

@Injectable({ providedIn: 'root' })
export class VerificarCorreoApiService {
  private readonly http = inject(HttpClient);
  private readonly urlVerificacion = `${API_URL}/auth/verificacion`;

  obtenerContexto(referencia: string): Observable<ContextoVerificacionRespuesta> {
    const referenciaSegura = encodeURIComponent(referencia);
    return this.http.get<ContextoVerificacionRespuesta>(
      `${this.urlVerificacion}/${referenciaSegura}`,
    );
  }

  verificar(peticion: VerificarCorreoPeticion): Observable<VerificarCorreoRespuesta> {
    return this.http.post<VerificarCorreoRespuesta>(this.urlVerificacion, peticion);
  }

  reenviar(peticion: ReenviarCodigoPeticion): Observable<ReenvioCorreoRespuesta> {
    return this.http.post<ReenvioCorreoRespuesta>(`${this.urlVerificacion}/reenvio`, peticion);
  }
}
