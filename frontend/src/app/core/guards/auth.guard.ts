import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models/user.model';
import { AuthService } from '../services/auth.service';

/**
 * Protege rutas por sesión y, opcionalmente, por rol (`data.role`).
 * Si el rol no coincide, redirige al inicio correspondiente al usuario.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const expectedRole = route.data['role'] as Role | undefined;
  if (expectedRole && !auth.hasRole(expectedRole)) {
    return router.createUrlTree([auth.homeFor()]);
  }
  return true;
};
