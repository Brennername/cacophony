import { Injectable, signal } from '@angular/core';

export interface UserSessionState {
  isAuthenticated: boolean;
  username?: string;
  email?: string;
  roles?: string[];
  role?: string;
  provider?: string;
  token?: string;
  avatarUrl?: string;
}

export interface DynamicAuthConfig {
  activeProvider: string;
  giteaPublicUrl: string;
  clientId: string;
  redirectUri: string;
  providers?: Array<{ id: string; name: string; enabled: boolean; authUrl?: string }>;
  gitea?: { enabled: boolean; authUrl: string };
  github?: { enabled: boolean; authUrl: string; clientId?: string };
  authentik?: {
    issuerUrl: string;
    clientId: string;
    redirectUri: string;
  };
  authelia?: {
    portalUrl: string;
    forwardAuthEnabled: boolean;
  };
}

/**
 * Service managing client-side SSO and administrative session state
 * across Gitea, GitHub, and local password authentication.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'cacophony-jwt-session';

  public readonly session = signal<UserSessionState>({
    isAuthenticated: false,
  });

  public readonly activeProvider = signal<string>('gitea');

  private authConfig: DynamicAuthConfig = {
    activeProvider: 'gitea',
    giteaPublicUrl: 'http://localhost:19634',
    clientId: '19e1f52a-a382-4998-87d1-5b3ab028c747',
    redirectUri: 'http://localhost:24072/auth/callback',
    gitea: {
      enabled: true,
      authUrl: 'http://localhost:19634/login/oauth/authorize?client_id=19e1f52a-a382-4998-87d1-5b3ab028c747&redirect_uri=http%3A%2F%2Flocalhost%3A24072%2Fauth%2Fcallback&response_type=code',
    },
  };

  constructor() {
    this.restoreSession();
    this.loadAuthConfig();
  }

  public async loadAuthConfig(): Promise<DynamicAuthConfig> {
    try {
      const res = await fetch('/api/config/auth');
      if (res.ok) {
        this.authConfig = await res.json();
        this.activeProvider.set(this.authConfig.activeProvider || 'gitea');
      }
    } catch {
      // Fallback to default Gitea configuration
    }
    return this.authConfig;
  }

  public async loginWithPassword(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Authentication failed' };
      }

      const data = await res.json();
      this.handleCallbackToken(
        data.token,
        data.user.username,
        data.user.email,
        data.user.roles || ['ADMIN', 'OPERATOR'],
        data.user.provider || 'local',
        data.user.role || 'ADMIN',
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  }

  public async exchangeOAuthCode(
    code: string,
    provider: string = 'gitea',
    redirectUri?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/auth/oauth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, provider, redirectUri }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'OAuth token exchange failed' };
      }

      const data = await res.json();
      this.handleCallbackToken(
        data.token,
        data.user.username,
        data.user.email,
        data.user.roles || ['OPERATOR'],
        data.user.provider || provider,
        data.user.role,
        data.user.avatarUrl,
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during OAuth exchange' };
    }
  }

  public isGitHubConfigured(): boolean {
    return Boolean(
      this.authConfig.github?.enabled ||
        this.authConfig.github?.clientId ||
        this.authConfig.github?.authUrl,
    );
  }

  public getAuthConfig(): DynamicAuthConfig {
    return this.authConfig;
  }

  public async login(): Promise<void> {
    const config = await this.loadAuthConfig();
    const provider = config.activeProvider || 'gitea';

    if (provider === 'github') {
      if (this.isGitHubConfigured()) {
        this.loginWithGitHub();
      } else {
        this.loginWithGitea();
      }
    } else if (provider === 'gitea') {
      this.loginWithGitea();
    } else if (provider === 'authentik' && config.authentik) {
      const issuer = config.authentik.issuerUrl.replace(/\/+$/, '');
      const clientId = config.authentik.clientId;
      const redirectUri = encodeURIComponent(config.authentik.redirectUri);
      const state = Math.random().toString(36).substring(2);
      window.location.href = `${issuer}/authorize/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email+groups&state=${state}`;
    } else {
      this.loginWithGitea();
    }
  }

  public loginWithGitea(): void {
    if (this.authConfig.gitea?.authUrl) {
      window.location.href = this.authConfig.gitea.authUrl;
      return;
    }
    const publicUrl = this.authConfig.giteaPublicUrl || 'http://localhost:19634';
    const clientId = this.authConfig.clientId || '19e1f52a-a382-4998-87d1-5b3ab028c747';
    const redirectUri = encodeURIComponent(this.authConfig.redirectUri || 'http://localhost:24072/auth/callback');
    const state = 'gitea_' + Math.random().toString(36).substring(2);
    window.location.href = `${publicUrl}/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}`;
  }

  public loginWithGitHub(): void {
    if (this.authConfig.github?.authUrl) {
      window.location.href = this.authConfig.github.authUrl;
      return;
    }
    const clientId = this.authConfig.github?.clientId;
    if (!clientId || !clientId.trim()) {
      console.warn('GitHub OAuth is not configured: GITHUB_CLIENT_ID is missing.');
      return;
    }
    const redirectUri = encodeURIComponent(this.authConfig.redirectUri || 'http://localhost:24072/auth/callback');
    const state = 'gh_' + Math.random().toString(36).substring(2);
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read%3Auser+user%3Aemail&state=${state}`;
  }

  public handleCallbackToken(
    token: string,
    username: string,
    email: string,
    roles: string[] = ['OPERATOR'],
    provider: string = 'gitea',
    role?: string,
    avatarUrl?: string,
  ): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    const resolvedRole = role || (roles.includes('ADMIN') ? 'ADMIN' : 'OPERATOR');
    this.session.set({
      isAuthenticated: true,
      username,
      email,
      roles,
      role: resolvedRole,
      provider,
      token,
      avatarUrl,
    });
  }

  public getToken(): string | undefined {
    return this.session().token || localStorage.getItem(this.TOKEN_KEY) || undefined;
  }

  public hasRole(role: string): boolean {
    const roles = this.session().roles || [];
    const primaryRole = this.session().role;
    return roles.includes(role) || primaryRole === role;
  }

  public isAuthorized(requiredRole: 'ADMIN' | 'OPERATOR'): boolean {
    const roles = this.session().roles || [];
    const primaryRole = this.session().role;
    if (roles.includes('ADMIN') || primaryRole === 'ADMIN') return true;
    return roles.includes(requiredRole) || primaryRole === requiredRole;
  }

  public logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.session.set({
      isAuthenticated: false,
    });
  }

  private async restoreSession(): Promise<void> {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const u = data.user;
          this.session.set({
            isAuthenticated: true,
            username: u.username,
            email: u.email,
            roles: u.roles || [u.role || 'OPERATOR'],
            role: u.role || 'OPERATOR',
            provider: u.provider,
            token,
          });
          return;
        }
      }
    } catch {
      // If validation endpoint fails, retain token tentatively for offline dev
    }

    // If verification was explicitly rejected
    this.logout();
  }
}
