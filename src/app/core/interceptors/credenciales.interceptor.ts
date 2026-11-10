import { HttpInterceptorFn } from '@angular/common/http';

export const credencialesInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));
