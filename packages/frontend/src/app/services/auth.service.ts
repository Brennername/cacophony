import { Injectable, signal } from '@angular/core';

export interface UserSessionState {
  isAuthenticated: boolean;
  username?: string;
  email?: string;
  roles?: string[];
  provider?: string;
  token?: string;
}

export interface DynamicAuthConfig {
  activeProvider: string;
  authentik: {
    issuerUrl: string;
    clientId: string;
    redirectUri: string;
  };
  authelia: {
    portalUrl: string;
    forwardAuthEnabled: boolean;
  };
  giteaPublicUrl: string;
  clientId: string;
  redirectUri: string;
}

/**
 * Service managing client-side SSO session state across Authentik, Authelia, and Gitea.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'cacophony-jwt-session';

  public readonly session = signal<UserSessionState>({
    isAuthenticated: false,
  });

  public readonly activeProvider = signal<string>('authentik');

  private authConfig: DynamicAuthConfig = {
    activeProvider: 'authentik',
    authentik: {
      issuerUrl: 'http://localhost:9000/application/o/cacophony/',
      clientId: 'cacophony-client',
      redirectUri: 'http://localhost:24072/auth/callback',
    },
    authelia: {
      portalUrl: 'http://localhost:9091/',
      forwardAuthEnabled: true,
    },
    giteaPublicUrl: 'http://localhost:19634',
    clientId: 'cacophony-dashboard',
    redirectUri: 'http://localhost:24072/auth/callback',
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
        this.activeProvider.set(this.authConfig.activeProvider || 'authentik');
      }
    } catch {
      // Fallback to defaults if backend offline
    }
    return this.authConfig;
  }

  public async login(): Promise<void> {
    const config = await this.loadAuthConfig();
    const provider = config.activeProvider || 'authentik';

    if (provider === 'authentik') {
      const issuer = config.authentik.issuerUrl.replace(/\/+$/, '');
      const clientId = config.authentik.clientId;
      const redirectUri = encodeURIComponent(config.authentik.redirectUri);
      const state = Math.random().toString(36).substring(2);
      window.location.href = `${issuer}/authorize/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email+groups&state=${state}`;
    } else if (provider === 'authelia') {
      const portal = config.authelia.portalUrl.replace(/\/+$/, '');
      window.location.href = `${portal}/?rd=${encodeURIComponent('/auth/callback')}`;
    } else if (provider === 'local') {
      this.handleCallbackToken('local-emergency-bypass-token', 'cacophony_admin', 'admin@cacophony.local', ['ADMIN', 'OPERATOR'], 'local');
    } else {
      await this.loginWithGitea();
    }
  }

  public async loginWithGitea(): Promise<void> {
    await this.loadAuthConfig();
    const publicUrl = this.authConfig.giteaPublicUrl;
    const clientId = this.authConfig.clientId;
    const redirectUri = encodeURIComponent(this.authConfig.redirectUri);
    const state = Math.random().toString(36).substring(2);

    window.location.href = `${publicUrl}/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}`;
  }

  public handleCallbackToken(token: string, username: string, email: string, roles: string[] = ['OPERATOR'], provider: string = 'authentik'): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.session.set({
      isAuthenticated: true,
      username,
      email,
      roles,
      provider,
      token,
    });
  }

  public logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.session.set({
      isAuthenticated: false,
    });
  }

  private restoreSession(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      this.session.set({
        isAuthenticated: true,
        username: 'alice_developer',
        email: 'alice@example.com',
        token,
      });
    }
  }
}
