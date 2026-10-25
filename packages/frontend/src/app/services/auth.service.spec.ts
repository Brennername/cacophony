import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService (regr-mvir6w91-8i42)', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    TestBed.configureTestingModule({
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
  });

  it('should initialize with an unauthenticated session state by default', () => {
    const session = service.session();
    expect(session.isAuthenticated).toBe(false);
    expect(session.token).toBeUndefined();
    expect(service.getToken()).toBeUndefined();
  });

  it('should handle token callback, persist to localStorage, and update session signals', () => {
    const sampleToken = 'mock-jwt-token-12345';
    service.handleCallbackToken(
      sampleToken,
      'adminUser',
      'admin@cacophony.local',
      ['ADMIN', 'OPERATOR'],
      'gitea',
      'ADMIN'
    );

    const session = service.session();
    expect(session.isAuthenticated).toBe(true);
    expect(session.username).toBe('adminUser');
    expect(session.email).toBe('admin@cacophony.local');
    expect(session.role).toBe('ADMIN');
    expect(session.token).toBe(sampleToken);
    expect(service.getToken()).toBe(sampleToken);
    expect(localStorage.getItem('cacophony-jwt-session')).toBe(sampleToken);
  });

  it('should correctly evaluate role membership and authorization level', () => {
    service.handleCallbackToken(
      'operator-token',
      'devUser',
      'dev@cacophony.local',
      ['OPERATOR'],
      'local',
      'OPERATOR'
    );

    expect(service.hasRole('OPERATOR')).toBe(true);
    expect(service.hasRole('ADMIN')).toBe(false);
    expect(service.isAuthorized('OPERATOR')).toBe(true);
    expect(service.isAuthorized('ADMIN')).toBe(false);

    // Upgrade to ADMIN
    service.handleCallbackToken(
      'admin-token',
      'superUser',
      'admin@cacophony.local',
      ['ADMIN'],
      'local',
      'ADMIN'
    );

    expect(service.hasRole('ADMIN')).toBe(true);
    expect(service.isAuthorized('ADMIN')).toBe(true);
    // ADMIN satisfies OPERATOR access
    expect(service.isAuthorized('OPERATOR')).toBe(true);
  });

  it('should clear token and reset session state on logout', () => {
    service.handleCallbackToken(
      'token-to-clear',
      'activeUser',
      'user@cacophony.local',
      ['OPERATOR'],
      'gitea'
    );

    expect(service.session().isAuthenticated).toBe(true);
    service.logout();

    expect(service.session().isAuthenticated).toBe(false);
    expect(service.session().token).toBeUndefined();
    expect(service.getToken()).toBeUndefined();
    expect(localStorage.getItem('cacophony-jwt-session')).toBeNull();
  });

  it('should authenticate via password login endpoint successfully', async () => {
    const mockUserResponse = {
      token: 'jwt-login-token',
      user: {
        username: 'daniel',
        email: 'daniel@cacophony.local',
        roles: ['ADMIN'],
        role: 'ADMIN',
        provider: 'local',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserResponse,
    } as Response);

    const result = await service.loginWithPassword('daniel', 'secretpass');
    expect(result.success).toBe(true);
    expect(service.session().isAuthenticated).toBe(true);
    expect(service.session().username).toBe('daniel');
    expect(service.session().role).toBe('ADMIN');
  });

  it('should handle failed password authentication gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    } as Response);

    const result = await service.loginWithPassword('unknown', 'wrongpass');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
    expect(service.session().isAuthenticated).toBe(false);
  });

  it('should exchange OAuth code and populate session state', async () => {
    const mockOAuthResponse = {
      token: 'oauth-jwt-token',
      user: {
        username: 'oauthUser',
        email: 'oauth@domain.com',
        roles: ['OPERATOR'],
        role: 'OPERATOR',
        provider: 'gitea',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockOAuthResponse,
    } as Response);

    const result = await service.exchangeOAuthCode('oauth-code-xyz', 'gitea');
    expect(result.success).toBe(true);
    expect(service.session().isAuthenticated).toBe(true);
    expect(service.session().username).toBe('oauthUser');
    expect(service.session().provider).toBe('gitea');
  });

  it('should detect when GitHub OAuth is configured or unconfigured', () => {
    expect(service.isGitHubConfigured()).toBe(false);
  });

  it('should not redirect if loginWithGitHub is called when unconfigured', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    service.loginWithGitHub();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('GitHub OAuth is not configured'),
    );
    warnSpy.mockRestore();
  });
});
