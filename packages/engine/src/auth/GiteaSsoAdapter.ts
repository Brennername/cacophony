import type { ISsoProvider, SsoValidationResult } from "./ISsoProvider.js";
import type { GiteaOAuthProvider } from "../gitea/GiteaOAuthProvider.js";
import type { SsoUserProfile } from "@cacophony/shared-types";

/**
 * Adapter wrapping GiteaOAuthProvider to conform to ISsoProvider.
 */
export class GiteaSsoAdapter implements ISsoProvider {
  public readonly providerType = "gitea" as const;
  private readonly provider: GiteaOAuthProvider;

  constructor(provider: GiteaOAuthProvider) {
    this.provider = provider;
  }

  public getAuthorizationUrl(state: string): string {
    return this.provider.getAuthorizationUrl(state);
  }

  public async exchangeCode(code: string): Promise<{ readonly accessToken: string; readonly user: SsoUserProfile }> {
    const session = await this.provider.handleCallback(code);
    return {
      accessToken: session.token,
      user: {
        id: String(session.user.id),
        username: session.user.username,
        email: session.user.email,
        displayName: session.user.fullName || session.user.username,
        groups: ["gitea-users"],
        roles: ["OPERATOR", "VIEWER"],
        provider: "gitea"
      }
    };
  }

  public async verifyToken(token: string): Promise<SsoValidationResult> {
    const res = this.provider.verifySessionJwt(token);
    if (!res.valid || !res.payload) {
      return { valid: false, error: "Token verification failed" };
    }

    const payload = res.payload as { sub?: string; username?: string; email?: string };

    return {
      valid: true,
      user: {
        id: String(payload.sub || "unknown"),
        username: String(payload.username || "gitea_user"),
        email: String(payload.email || "user@gitea.local"),
        groups: ["gitea-users"],
        roles: ["OPERATOR", "VIEWER"],
        provider: "gitea"
      }
    };
  }

  public async getUserProfile(accessToken: string): Promise<SsoUserProfile> {
    const res = await this.verifyToken(accessToken);
    if (res.user) return res.user;

    return {
      id: "gitea-user-default",
      username: "gitea_user",
      email: "user@gitea.local",
      displayName: "Gitea User",
      groups: ["gitea-users"],
      roles: ["OPERATOR", "VIEWER"],
      provider: "gitea"
    };
  }
}
