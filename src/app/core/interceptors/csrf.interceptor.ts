import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, of, switchMap, throwError } from 'rxjs';

import { API_URL } from '../api/api.config';

const COOKIE = 'XSRF-TOKEN';
const CABECERA = 'X-XSRF-TOKEN';
const METODOS_QUE_MODIFICAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function leerToken(): string | null {
  const coincidencia = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  return coincidencia ? decodeURIComponent(coincidencia[1]) : null;
}

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!METODOS_QUE_MODIFICAN.has(req.method) || !req.url.startsWith(API_URL)) {
    return next(req);
  }
  const http = inject(HttpClient);
  const enviar = () => {
    const token = leerToken();
    return next(token ? req.clone({ setHeaders: { [CABECERA]: token } }) : req);
  };

  const pedirToken = () => http.get(`${API_URL}/health`, { responseType: 'text' }).pipe(catchError(() => of('')));
  const inicio = leerToken() ? enviar() : pedirToken().pipe(switchMap(() => enviar()));

  return inicio.pipe(
    catchError((error: unknown) => {
      const tokenRechazado = error instanceof HttpErrorResponse && error.status === 403
        && (error.error as { code?: string } | null)?.code === 'CSRF_INVALID';
      if (!tokenRechazado) {
        return throwError(() => error);
      }
      return pedirToken().pipe(switchMap(() => enviar()));
    }),
  );
};
