import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, of, switchMap, throwError } from 'rxjs';

import { API_URL } from '../api/api.config';

const COOKIE = 'XSRF-TOKEN';
const CABECERA = 'X-XSRF-TOKEN';
const METODOS_QUE_MODIFICAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Valor actual de la cookie XSRF-TOKEN, que el backend deja legible (no es la cookie de sesión, que es HttpOnly). */
function leerToken(): string | null {
  const coincidencia = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  return coincidencia ? decodeURIComponent(coincidencia[1]) : null;
}

/**
 * Protección contra CSRF: en toda petición que modifica datos hacia la API repite el valor de la cookie XSRF-TOKEN en
 * la cabecera X-XSRF-TOKEN; el backend solo la acepta si coinciden, y un sitio externo no puede leer esa cookie.
 *
 * No se usa el soporte incorporado de Angular porque ignora las URL absolutas hacia otro origen (la API está en otro
 * puerto). Si la cookie aún no existe se pide con una consulta pública antes de enviar; y si el backend rechaza el
 * token (CSRF_INVALID, p. ej. la cookie se borró), se pide uno nuevo y se reintenta una sola vez.
 */
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
  // Primera acción de un visitante nuevo: aún no hay cookie, así que se pide antes de enviar (sin un 403 de por medio).
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
