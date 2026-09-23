import type { ISsoProvider, SsoValidationResult } from "./ISsoProvider.js";
import type { SsoUserProfile } from "@cacophony/shared-types";

/**
 * Local emergency bypass authentication provider.
 * Used during initial setup or air-gapped emergency situations.
 */
export class LocalBypassSsoProvider implements ISsoProvider {
  public readonly providerType = "local" as const;

  public getAuthorizationUrl(state: string): string {
    return `/auth/callback?code=emergency-local-bypass&state=${encodeURIComponent(state)}`;
  }

  public async exchangeCode(_code: string): Promise<{ readonly accessToken: string; readonly user: SsoUserProfile }> {
    const user: SsoUserProfile = {
      id: "local-admin-root",
      username: "cacophony_admin",
      email: "admin@cacophony.local",
      displayName: "Local Administrator (Emergency Bypass)",
      groups: ["cacophony-admins"],
      roles: ["ADMIN", "OPERATOR", "VIEWER"],
      provider: "local"
    };

    return {
      accessToken: "local-emergency-bypass-token",
      user
    };
  }

  public async verifyToken(token: string): Promise<SsoValidationResult> {
    if (token === "local-emergency-bypass-token") {
      return {
        valid: true,
        user: {
          id: "local-admin-root",
          username: "cacophony_admin",
          email: "admin@cacophony.local",
          displayName: "Local Administrator",
          groups: ["cacophony-admins"],
          roles: ["ADMIN", "OPERATOR", "VIEWER"],
          provider: "local"
        }
      };
    }
    return { valid: false, error: "Invalid local bypass token" };
  }

  public async getUserProfile(_accessToken: string): Promise<SsoUserProfile> {
    return {
      id: "local-admin-root",
      username: "cacophony_admin",
      email: "admin@cacophony.local",
      displayName: "Local Administrator",
      groups: ["cacophony-admins"],
      roles: ["ADMIN", "OPERATOR", "VIEWER"],
      provider: "local"
    };
  }
}
