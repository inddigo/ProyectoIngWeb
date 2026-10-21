import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/** Adjunta el JWT a las peticiones hacia la API. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  const base = new URL(environment.apiUrl || '/', window.location.origin);
  const target = new URL(req.url, window.location.origin);
  const isApi = target.origin === base.origin && /^\/(auth|api)(\/|$)/.test(target.pathname);
  if (!token || !isApi) {
    return next(req);
  }
  return next(
    req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) }),
  );
};
