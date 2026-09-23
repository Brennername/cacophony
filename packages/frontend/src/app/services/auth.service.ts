import { Injectable, signal } from '@angular/core';

export interface UserSessionState {
  isAuthenticated: boolean;
  username?: string;
  email?: string;
  token?: string;
}

/**
 * Service managing client-side Gitea OAuth2 SSO session state.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'cacophony-jwt-session';

  public readonly session = signal<UserSessionState>({
    isAuthenticated: false,
  });

  constructor() {
    this.restoreSession();
  }

  public loginWithGitea(): void {
    const publicUrl = 'http://localhost:19634';
    const clientId = 'cacophony-dashboard';
    const redirectUri = encodeURIComponent('http://localhost:24072/auth/callback');
    const state = Math.random().toString(36).substring(2);

    window.location.href = `${publicUrl}/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}`;
  }

  public handleCallbackToken(token: string, username: string, email: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.session.set({
      isAuthenticated: true,
      username,
      email,
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
