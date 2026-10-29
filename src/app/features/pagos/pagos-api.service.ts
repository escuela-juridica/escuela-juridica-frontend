import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api/api.config';
import { ConstanciaPago, PagoCheckout, PagoDetalle, PagosCurso } from './pago.model';

/** HU-047 — Consume `/api/app/pagos` y `/api/app/cursos/{id}/pagos`. */
@Injectable({ providedIn: 'root' })
export class PagosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/app`;

  iniciar(cursoId: number, importeConfirmado: number): Observable<PagoCheckout> {
    return this.http.post<PagoCheckout>(`${this.base}/cursos/${cursoId}/pagos/iniciar`, { importeConfirmado });
  }

  intentos(cursoId: number): Observable<PagosCurso> {
    return this.http.get<PagosCurso>(`${this.base}/cursos/${cursoId}/pagos`);
  }

  enviarToken(numeroPedido: string, tokenId: string): Observable<PagoDetalle> {
    return this.http.post<PagoDetalle>(`${this.base}/pagos/${numeroPedido}/token`, { tokenId });
  }

  detalle(numeroPedido: string): Observable<PagoDetalle> {
    return this.http.get<PagoDetalle>(`${this.base}/pagos/${numeroPedido}`);
  }

  constancia(numeroPedido: string): Observable<ConstanciaPago> {
    return this.http.get<ConstanciaPago>(`${this.base}/pagos/${numeroPedido}/constancia`);
  }

  reenviarAviso(numeroPedido: string): Observable<PagoDetalle> {
    return this.http.post<PagoDetalle>(`${this.base}/pagos/${numeroPedido}/reenviar-aviso`, {});
  }
}
