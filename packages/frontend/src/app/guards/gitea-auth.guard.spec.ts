import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { signal } from '@angular/core';
import { giteaAuthGuard } from './gitea-auth.guard';
import { AuthService, UserSessionState } from '../services/auth.service';

/**
 * Unit test suite verifying GiteaAuthGuard functional route guard behavior.
 * Evaluates authenticated session pass-through and unauthenticated login redirection.
 */
describe('giteaAuthGuard', () => {
  let mockAuthService: {
    session: ReturnType<typeof signal<UserSessionState>>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/protected' } as RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = {
      session: signal<UserSessionState>({
        isAuthenticated: false,
      }),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should allow route activation when user is authenticated', () => {
    mockAuthService.session.set({
      isAuthenticated: true,
      username: 'testuser',
      role: 'OPERATOR',
    });

    const result = TestBed.runInInjectionContext(() =>
      giteaAuthGuard(dummyRoute, dummyState)
    );

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect unauthenticated users to login and prevent route activation', () => {
    mockAuthService.session.set({
      isAuthenticated: false,
    });

    const result = TestBed.runInInjectionContext(() =>
      giteaAuthGuard(dummyRoute, dummyState)
    );

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
