import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional route guard enforcing superadmin access on administrative endpoints.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.session().isAuthenticated && authService.hasRole('ADMIN')) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
