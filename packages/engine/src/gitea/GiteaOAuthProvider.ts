import * as crypto from "node:crypto";
import type { GiteaApiClient } from "./GiteaApiClient.js";

export interface GiteaOAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly giteaPublicUrl: string;
  readonly jwtSecret: string;
}

export interface AuthSession {
  readonly token: string;
  readonly user: {
    readonly id: number;
    readonly username: string;
    readonly email: string;
    readonly fullName?: string;
  };
  readonly expiresAt: number;
}

/**
 * Gitea OAuth2 SSO Authentication Provider for Cacophony backend.
 * Implements authorization code grant flow, token exchange, user profile extraction,
 * and JWT session generation.
 */
export class GiteaOAuthProvider {
  private readonly client: GiteaApiClient;
  private readonly config: GiteaOAuthConfig;

  constructor(client: GiteaApiClient, config: GiteaOAuthConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Generates authorization URL for redirecting user to Gitea login.
   */
  public getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      state
    });

    return `${this.config.giteaPublicUrl.replace(/\/+$/, "")}/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handles callback from Gitea OAuth2, exchanges code for access token,
   * fetches user profile, and returns signed session JWT.
   */
  public async handleCallback(code: string): Promise<AuthSession> {
    const tokenResponse = await this.client.exchangeOAuthCode(
      this.config.clientId,
      this.config.clientSecret,
      code,
      this.config.redirectUri
    );

    const user = await this.client.getAuthenticatedUser(tokenResponse.access_token);
    const expiresAt = Date.now() + 24 * 3600 * 1000; // 24 hours

    const payload = {
      sub: String(user.id),
      username: user.login,
      email: user.email,
      exp: Math.floor(expiresAt / 1000)
    };

    const sessionJwt = this.signJwt(payload, this.config.jwtSecret);

    return {
      token: sessionJwt,
      user: {
        id: user.id,
        username: user.login,
        email: user.email,
        ...(user.full_name ? { fullName: user.full_name } : {})
      },
      expiresAt
    };
  }

  /**
   * Validates and verifies incoming session JWT.
   */
  public verifySessionJwt(token: string): { valid: boolean; payload?: Record<string, unknown> } {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return { valid: false };

      const [headerB64, payloadB64, sigB64] = parts;
      if (!headerB64 || !payloadB64 || !sigB64) return { valid: false };

      const dataToSign = `${headerB64}.${payloadB64}`;
      const expectedSig = crypto
        .createHmac("sha256", this.config.jwtSecret)
        .update(dataToSign)
        .digest("base64url");

      if (sigB64 !== expectedSig) {
        return { valid: false };
      }

      const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { valid: false };
      }

      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }

  private signJwt(payload: Record<string, unknown>, secret: string): string {
    const header = { alg: "HS256", typ: "JWT" };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const dataToSign = `${headerB64}.${payloadB64}`;
    const sigB64 = crypto
      .createHmac("sha256", secret)
      .update(dataToSign)
      .digest("base64url");

    return `${dataToSign}.${sigB64}`;
  }
}
