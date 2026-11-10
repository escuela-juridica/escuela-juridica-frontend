import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Session } from './session';
import { urlRetornoSegura } from './url-retorno';

export const sessionGuard: CanActivateFn = (_ruta, estado) => {
  const session = inject(Session);
  const router = inject(Router);

  if (session.estaAutenticado()) {
    return true;
  }

  const retorno = urlRetornoSegura(estado.url);
  return router.createUrlTree(['/acceso'], retorno ? { queryParams: { returnUrl: retorno } } : {});
};
