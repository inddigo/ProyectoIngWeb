import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Manejo centralizado de errores HTTP:
 * - 0: sin conexión con el servidor.
 * - 401 fuera de /auth: sesión expirada -> logout y redirección a login.
 * - 5xx: aviso genérico.
 * Los componentes siguen recibiendo el error para manejar casos puntuales.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        notify.show('No se pudo conectar con el servidor', 'danger');
      } else if (error.status === 401 && !req.url.includes('/auth/')) {
        auth.logout();
        notify.show('Tu sesión expiró. Inicia sesión nuevamente.', 'warning');
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url },
        });
      } else if (error.status >= 500) {
        notify.show('Error interno del servidor. Intenta más tarde.', 'danger');
      }
      return throwError(() => error);
    }),
  );
};

/** Extrae un mensaje legible de un error del backend NestJS. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as HttpErrorResponse;
  const message = e?.error?.message;
  if (Array.isArray(message)) {
    return message.join('. ');
  }
  return typeof message === 'string' ? message : fallback;
}
