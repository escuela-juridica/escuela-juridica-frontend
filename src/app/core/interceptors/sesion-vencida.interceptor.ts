import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SesionVencidaServicio } from '../session/sesion-vencida.service';

const RUTA_EXCLUIDA = /\/auth\//;

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
