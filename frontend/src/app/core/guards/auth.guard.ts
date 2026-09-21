import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const expectedRole = route.data['role'];
  if (expectedRole && !authService.hasRole(expectedRole)) {
    return router.createUrlTree(['/']); // Redirect to home if unauthorized
  }

  return true;
};
