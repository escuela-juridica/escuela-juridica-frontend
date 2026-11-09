import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Session } from './session';

export const sessionGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);

  if (session.estaAutenticado()) {
    return true;
  }

  return router.parseUrl('/acceso');
};
