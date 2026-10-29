import { HttpInterceptorFn } from '@angular/common/http';

// Adjunta la cookie de sesión (ESEJUR_SESION, HttpOnly) a toda petición, para
// que viaje aunque frontend y backend estén en orígenes distintos. Hoy la usan
// el registro y el anti-robot; el login de HU-001 todavía no está mergeado al
// frontend, así que ninguna ruta autenticada la ejercita todavía.
export const credencialesInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));
