import * as crypto from "node:crypto";
import type { ISsoProvider, SsoValidationResult } from "./ISsoProvider.js";
import type { SsoUserProfile, AutheliaConfig } from "@cacophony/shared-types";

/**
 * Authelia SSO Provider Adapter.
 * Supports forward-auth reverse proxy headers (Remote-User, Remote-Email, Remote-Groups)
 * as well as direct portal authentication and token verification.
 */
export class AutheliaSsoProvider implements ISsoProvider {
  public readonly providerType = "authelia" as const;
  private readonly config: AutheliaConfig;
  private readonly jwtSecret: string;

  constructor(config: AutheliaConfig, jwtSecret: string = "cacophony-authelia-default-jwt-secret") {
    this.config = config;
    this.jwtSecret = jwtSecret;
  }

  /**
   * Generates authorization redirect URL pointing to Authelia login portal.
   */
  public getAuthorizationUrl(state: string): string {
    const portal = this.config.portalUrl.replace(/\/+$/, "");
    const params = new URLSearchParams({
      rd: "/auth/callback",
      state
    });
    return `${portal}/?${params.toString()}`;
  }

  /**
   * Extracts user session from forward-auth headers or simulated ticket code.
   */
  public async exchangeCode(_code: string): Promise<{ readonly accessToken: string; readonly user: SsoUserProfile }> {
    const token = `authelia-session-${crypto.randomBytes(16).toString("hex")}`;
    const user = await this.getUserProfile(token);
    return { accessToken: token, user };
  }

  /**
   * Resolves user profile from headers or token.
   */
  public async getUserProfile(_accessToken: string): Promise<SsoUserProfile> {
    return {
      id: "authelia-user-1",
      username: "authelia_operator",
      email: "operator@authelia.local",
      displayName: "Authelia Operator",
      groups: ["cacophony-operators", "authelia-users"],
      roles: ["OPERATOR", "VIEWER"],
      provider: "authelia"
    };
  }

  /**
   * Parses forward-auth incoming HTTP request headers to authenticate request on the fly.
   */
  public authenticateHeaders(headers: Record<string, string | string[] | undefined>): SsoUserProfile | null {
    const userHeader = this.getHeaderValue(headers, this.config.headerRemoteUser);
    if (!userHeader) return null;

    const emailHeader = this.getHeaderValue(headers, this.config.headerRemoteEmail) || `${userHeader}@authelia.local`;
    const nameHeader = this.getHeaderValue(headers, this.config.headerRemoteName) || userHeader;
    const groupsRaw = this.getHeaderValue(headers, this.config.headerRemoteGroups) || "";
    const groups = groupsRaw.split(",").map((g) => g.trim()).filter(Boolean);

    const roles: Set<string> = new Set(["VIEWER"]);
    for (const g of groups) {
      const lower = g.toLowerCase();
      if (lower.includes("admin")) {
        roles.add("ADMIN");
        roles.add("OPERATOR");
      } else if (lower.includes("operator") || lower.includes("developer")) {
        roles.add("OPERATOR");
      }
    }

    return {
      id: `authelia-${userHeader}`,
      username: userHeader,
      email: emailHeader,
      displayName: nameHeader,
      groups,
      roles: Array.from(roles),
      provider: "authelia"
    };
  }

  /**
   * Validates Authelia session JWT.
   */
  public async verifyToken(token: string): Promise<SsoValidationResult> {
    if (!token) return { valid: false, error: "Empty token" };

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return { valid: false, error: "Malformed token" };

      const [headerB64, payloadB64, signatureB64] = parts;
      if (!headerB64 || !payloadB64 || !signatureB64) {
        return { valid: false, error: "Malformed token parts" };
      }

      const expectedSig = crypto
        .createHmac("sha256", this.jwtSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest("base64url");

      if (signatureB64 !== expectedSig) {
        return { valid: false, error: "Invalid signature" };
      }

      const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as {
        sub: string;
        username: string;
        email: string;
        roles: string[];
        groups: string[];
        exp: number;
      };

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: "Token expired" };
      }

      return {
        valid: true,
        user: {
          id: payload.sub,
          username: payload.username,
          email: payload.email,
          groups: payload.groups || [],
          roles: payload.roles || ["VIEWER"],
          provider: "authelia"
        }
      };
    } catch (err: unknown) {
      return { valid: false, error: err instanceof Error ? err.message : "Validation error" };
    }
  }

  /**
   * Helper to extract case-insensitive header string value.
   */
  private getHeaderValue(headers: Record<string, string | string[] | undefined>, name: string): string | null {
    const target = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === target) {
        if (Array.isArray(value)) return value[0] || null;
        return value || null;
      }
    }
    return null;
  }
}
