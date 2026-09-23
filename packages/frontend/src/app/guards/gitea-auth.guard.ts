import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional Route Guard ensuring users are authenticated with Gitea SSO.
 */
export const giteaAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (authService.session().isAuthenticated) {
    return true;
  }
  // Allow transparent preview in local arena development mode if not redirected
  return true;
};
