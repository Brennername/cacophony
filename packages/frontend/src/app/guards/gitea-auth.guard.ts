import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * GiteaAuthGuard checks if a user is authenticated before allowing access to a route.
 * If the user is not authenticated, it redirects them to the login page.
 */
export const giteaAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.session().isAuthenticated) {
    return true; // User is authenticated, allow access
  }

  // User is not authenticated, redirect to login page
  router.navigate(['/login']);
  return false;
};
