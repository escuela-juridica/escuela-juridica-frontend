import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Session } from './session';

export const adminGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);

  if (session.estaAutenticado() && session.usuario()?.rolPrincipal === 'ADMINISTRADOR') {
    return true;
  }

  return router.parseUrl('/acceso');
};
