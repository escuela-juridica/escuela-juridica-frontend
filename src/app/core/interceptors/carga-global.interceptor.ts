import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { CargadorGlobalService } from '../carga/cargador-global.service';

export const cargaGlobalInterceptor: HttpInterceptorFn = (req, next) => {
  const cargador = inject(CargadorGlobalService);
  cargador.iniciar();
  return next(req).pipe(finalize(() => cargador.finalizar()));
};
