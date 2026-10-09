import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SesionVencidaServicio } from '../session/sesion-vencida.service';

// Un 401 bajo /auth/ es normal y no significa "sesión vencida a mitad de uso": es un login con
// credenciales incorrectas, o la consulta de sesión inicial de un visitante que nunca iba a
// tener cookie. Ese caso lo maneja cada pantalla por su cuenta (acceso.ts, session.ts al
// arrancar), no este interceptor.
const RUTA_EXCLUIDA = /\/auth\//;

/** Captura cualquier 401 de cualquier petición (admin o alumno) y dispara el aviso global de
 * sesión vencida — sin este interceptor, cada pantalla tenía que detectarlo por su cuenta (y la
 * mayoría no lo hacía). */
export const sesionVencidaInterceptor: HttpInterceptorFn = (req, next) => {
  const sesionVencida = inject(SesionVencidaServicio);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !RUTA_EXCLUIDA.test(req.url)) {
        sesionVencida.manejar();
      }
      return throwError(() => error);
    }),
  );
};
