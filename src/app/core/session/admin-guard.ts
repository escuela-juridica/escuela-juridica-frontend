import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Session } from './session';

/** Protege las rutas bajo /admin. Exige sesión activa y rol ADMINISTRADOR. */
export const adminGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);

  if (session.estaAutenticado() && session.usuario()?.rolPrincipal === 'ADMINISTRADOR') {
    return true;
  }

  return router.parseUrl('/acceso');
};
