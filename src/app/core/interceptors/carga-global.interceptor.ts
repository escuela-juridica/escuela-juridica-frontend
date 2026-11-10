import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { CargadorGlobalService } from '../carga/cargador-global.service';

export const SIN_CARGA_GLOBAL = new HttpContextToken<boolean>(() => false);

export const cargaGlobalInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SIN_CARGA_GLOBAL)) {
    return next(req);
  }
  const cargador = inject(CargadorGlobalService);
  cargador.iniciar();
  return next(req).pipe(finalize(() => cargador.finalizar()));
};
