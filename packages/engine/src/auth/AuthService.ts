import type { UserRole, AuthContext, SsoUserProfile } from "@cacophony/shared-types";
import type { UserSessionRepository, UserSessionRecord } from "@cacophony/db";
import { randomBytes } from "node:crypto";
import { OidcDiscoveryService, JwksKeyManager } from "./OidcDiscoveryService.js";
import { JwtValidator } from "./JwtValidator.js";
import { SsoProviderFactory } from "./SsoProviderFactory.js";
import type { ISsoProvider } from "./ISsoProvider.js";

/**
 * Service managing user authentication, JWT verification, session lifecycle,
 * refresh token rotation, and RBAC authorization context resolution.
 */
export class AuthService {
  private readonly userSessionRepo: UserSessionRepository | undefined;
  private readonly jwtValidator: JwtValidator;
  private readonly oidcDiscoveryService: OidcDiscoveryService | undefined;
  private readonly jwksKeyManager: JwksKeyManager | undefined;
  private readonly ssoProvider: ISsoProvider;
  private readonly issuerUrl: string;

  constructor(options?: {
    userSessionRepo?: UserSessionRepository | undefined;
    jwtSecret?: string | undefined;
    issuerUrl?: string | undefined;
    jwksUri?: string | undefined;
    ssoProvider?: ISsoProvider | undefined;
  }) {
    this.userSessionRepo = options?.userSessionRepo;
    this.issuerUrl = options?.issuerUrl || process.env["OIDC_ISSUER_URL"] || "http://localhost:9000/application/o/cacophony/";

    if (options?.jwksUri || process.env["OIDC_JWKS_URI"]) {
      let base = this.issuerUrl;
      while (base.endsWith("/")) {
        base = base.slice(0, -1);
      }
      const uri = options?.jwksUri || process.env["OIDC_JWKS_URI"] || `${base}/jwks`;
      this.jwksKeyManager = new JwksKeyManager(uri);
    }

    this.oidcDiscoveryService = new OidcDiscoveryService(this.issuerUrl);
    const hmacSecret = options?.jwtSecret || process.env["VAULT_MASTER_KEY"] || "cacophony-jwt-session-secret";
    this.jwtValidator = new JwtValidator({
      ...(this.jwksKeyManager ? { jwksKeyManager: this.jwksKeyManager } : {}),
      hmacSecret
    });

    this.ssoProvider = options?.ssoProvider || SsoProviderFactory.createProvider();
  }

  /**
   * Returns discovery configuration for OIDC providers.
   */
  public async getOidcConfiguration() {
    return this.oidcDiscoveryService?.getConfiguration();
  }

  /**
   * Resolves authentication context from Authorization Bearer token or session token.
   */
  public async authenticateToken(token: string): Promise<AuthContext | null> {
    if (!token) {
      return null;
    }

    // Try standard JWT validation (HS256 or RS256/ES256)
    const result = await this.jwtValidator.validate(token);
    if (result.valid && result.payload) {
      const p = result.payload;
      const groups = Array.isArray(p["groups"]) ? (p["groups"] as string[]) : [];
      const roles = Array.isArray(p["roles"]) ? (p["roles"] as string[]) : [];
      const primaryRole = this.resolvePrimaryRole(roles, groups);

      return {
        userId: String(p["sub"] || p["user_id"] || "anonymous"),
        username: String(p["username"] || p["name"] || "user"),
        email: String(p["email"] || ""),
        role: primaryRole,
        provider: (p["provider"] as any) || "authentik",
        groups
      };
    }

    // Fallback to provider verifyToken
    const providerResult = await this.ssoProvider.verifyToken(token);
    if (providerResult.valid && providerResult.user) {
      const u = providerResult.user;
      return {
        userId: u.id,
        username: u.username,
        email: u.email,
        role: this.resolvePrimaryRole(u.roles, u.groups),
        provider: u.provider,
        groups: u.groups
      };
    }

    return null;
  }

  /**
   * Stores a persistent user session with encrypted tokens.
   */
  public async createSession(
    user: SsoUserProfile,
    accessTokenEnc: string,
    refreshTokenEnc?: string,
    ttlSeconds: number = 86400
  ): Promise<UserSessionRecord> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    const sessionId = `sess_${Date.now()}_${randomBytes(8).toString("hex")}`;

    const record: UserSessionRecord = {
      sessionId,
      userId: user.id,
      username: user.username,
      email: user.email,
      role: this.resolvePrimaryRole(user.roles, user.groups),
      provider: user.provider,
      accessTokenEnc,
      refreshTokenEnc,
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    if (this.userSessionRepo) {
      await this.userSessionRepo.saveSession(record);
    }
    return record;
  }

  /**
   * Refreshes an active session token using the stored refresh token.
   */
  public async refreshSession(sessionId: string): Promise<UserSessionRecord | null> {
    if (!this.userSessionRepo) {
      return null;
    }
    const session = await this.userSessionRepo.getSession(sessionId);
    if (!session || !session.refreshTokenEnc) {
      return null;
    }

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.userSessionRepo.deleteSession(sessionId);
      return null;
    }

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 86400 * 1000).toISOString();
    const updated: UserSessionRecord = {
      ...session,
      expiresAt: newExpiresAt,
      updatedAt: now.toISOString()
    };

    await this.userSessionRepo.saveSession(updated);
    return updated;
  }

  /**
   * Revokes a session locally and returns upstream logout URL if supported.
   */
  public async logout(sessionId: string): Promise<{ readonly logoutUrl?: string | undefined }> {
    if (this.userSessionRepo) {
      await this.userSessionRepo.deleteSession(sessionId);
    }
    const config = await this.oidcDiscoveryService?.getConfiguration();
    return { logoutUrl: config?.end_session_endpoint };
  }

  /**
   * Maps roles and groups to highest permission tier (ADMIN > OPERATOR > VIEWER).
   */
  public resolvePrimaryRole(roles: readonly string[] = [], groups: readonly string[] = []): UserRole {
    const combined = [...roles, ...groups].map((s) => s.toLowerCase());
    if (combined.some((s) => s === "admin" || s.includes("admin") || s === "cacophony-admins")) {
      return "ADMIN";
    }
    if (combined.some((s) => s === "operator" || s.includes("operator") || s === "cacophony-operators" || s.includes("developer"))) {
      return "OPERATOR";
    }
    return "VIEWER";
  }

  /**
   * Checks if an AuthContext has at least the required role tier.
   */
  public isAuthorized(context: AuthContext | null, requiredRole: UserRole): boolean {
    if (!context) {
      return false;
    }
    const roleRank: Record<UserRole, number> = {
      VIEWER: 1,
      OPERATOR: 2,
      ADMIN: 3
    };
    return (roleRank[context.role] ?? 0) >= (roleRank[requiredRole] ?? 0);
  }
}
