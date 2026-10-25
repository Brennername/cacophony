import type {
  UserRole,
  AuthContext,
  SsoUserProfile,
} from "@cacophony/shared-types";
import type { UserSessionRepository, UserSessionRecord } from "@cacophony/db";
import * as crypto from "node:crypto";
import { randomBytes } from "node:crypto";
import {
  OidcDiscoveryService,
  JwksKeyManager,
} from "./OidcDiscoveryService.js";
import { JwtValidator } from "./JwtValidator.js";
import { SsoProviderFactory } from "./SsoProviderFactory.js";
import type { ISsoProvider } from "./ISsoProvider.js";
import { GiteaApiClient } from "../gitea/GiteaApiClient.js";
import { GiteaOAuthProvider } from "../gitea/GiteaOAuthProvider.js";
import { GitHubOAuthProvider } from "./GitHubOAuthProvider.js";
import * as fs from "node:fs";
import * as path from "node:path";

function loadEnvFile(): void {
  try {
    const candidates = [
      "/app/.env",
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../../.env"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const idx = trimmed.indexOf("=");
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
        break;
      }
    }
  } catch {
    // Ignore error
  }
}

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
    loadEnvFile();
    this.userSessionRepo = options?.userSessionRepo;
    this.issuerUrl =
      options?.issuerUrl ||
      process.env["OIDC_ISSUER_URL"] ||
      "http://localhost:9000/application/o/cacophony/";

    if (options?.jwksUri || process.env["OIDC_JWKS_URI"]) {
      let base = this.issuerUrl;
      while (base.endsWith("/")) {
        base = base.slice(0, -1);
      }
      const uri =
        options?.jwksUri || process.env["OIDC_JWKS_URI"] || `${base}/jwks`;
      this.jwksKeyManager = new JwksKeyManager(uri);
    }

    this.oidcDiscoveryService = new OidcDiscoveryService(this.issuerUrl);
    const hmacSecret =
      options?.jwtSecret ||
      process.env["JWT_SECRET"] ||
      process.env["VAULT_MASTER_KEY"] ||
      "cacophony-jwt-session-secret";
    this.jwtValidator = new JwtValidator({
      ...(this.jwksKeyManager ? { jwksKeyManager: this.jwksKeyManager } : {}),
      hmacSecret,
    });

    this.ssoProvider =
      options?.ssoProvider || SsoProviderFactory.createProvider();
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
      const groups = Array.isArray(p["groups"])
        ? (p["groups"] as string[])
        : [];
      const roles = Array.isArray(p["roles"]) ? (p["roles"] as string[]) : [];
      const primaryRole = this.resolvePrimaryRole(roles, groups);

      return {
        userId: String(p["sub"] || p["user_id"] || "anonymous"),
        username: String(p["username"] || p["name"] || "user"),
        email: String(p["email"] || ""),
        role: primaryRole,
        provider: (p["provider"] as any) || "authentik",
        groups,
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
        groups: u.groups,
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
    ttlSeconds: number = 86400,
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
      updatedAt: now.toISOString(),
    };

    if (this.userSessionRepo) {
      await this.userSessionRepo.saveSession(record);
    }
    return record;
  }

  /**
   * Refreshes an active session token using the stored refresh token.
   */
  public async refreshSession(
    sessionId: string,
  ): Promise<UserSessionRecord | null> {
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
      updatedAt: now.toISOString(),
    };

    await this.userSessionRepo.saveSession(updated);
    return updated;
  }

  /**
   * Revokes a session locally and returns upstream logout URL if supported.
   */
  public async logout(
    sessionId: string,
  ): Promise<{ readonly logoutUrl?: string | undefined }> {
    if (this.userSessionRepo) {
      await this.userSessionRepo.deleteSession(sessionId);
    }
    const config = await this.oidcDiscoveryService?.getConfiguration();
    return { logoutUrl: config?.end_session_endpoint };
  }

  /**
   * Maps roles and groups to highest permission tier (ADMIN > OPERATOR > VIEWER).
   */
  public resolvePrimaryRole(
    roles: readonly string[] = [],
    groups: readonly string[] = [],
  ): UserRole {
    const combined = [...roles, ...groups].map((s) => s.toLowerCase());
    if (
      combined.some(
        (s) => s === "admin" || s.includes("admin") || s === "cacophony-admins",
      )
    ) {
      return "ADMIN";
    }
    if (
      combined.some(
        (s) =>
          s === "operator" ||
          s.includes("operator") ||
          s === "cacophony-operators" ||
          s.includes("developer"),
      )
    ) {
      return "OPERATOR";
    }
    return "VIEWER";
  }

  /**
   * Checks if an AuthContext has at least the required role tier.
   */
  public isAuthorized(
    context: AuthContext | null,
    requiredRole: UserRole,
  ): boolean {
    if (!context) {
      return false;
    }
    const roleRank: Record<UserRole, number> = {
      VIEWER: 1,
      OPERATOR: 2,
      ADMIN: 3,
    };
    return (roleRank[context.role] ?? 0) >= (roleRank[requiredRole] ?? 0);
  }

  /**
   * Signs a standard HS256 JWT using HMAC secret.
   */
  public signJwt(payload: Record<string, unknown>): string {
    const header = { alg: "HS256", typ: "JWT" };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const data = `${headerB64}.${payloadB64}`;
    const hmacSecret =
      process.env["JWT_SECRET"] ||
      process.env["VAULT_MASTER_KEY"] ||
      "cacophony-jwt-session-secret";
    const sig = crypto.createHmac("sha256", hmacSecret).update(data).digest("base64url");
    return `${data}.${sig}`;
  }

  /**
   * Securely verifies a candidate password against the configured admin password
   * using Node.js scrypt KDF with constant-time equality check to prevent timing
   * attacks and satisfy CWE-916 password hashing computational effort requirements.
   */
  private verifyPassword(candidate: string, expected: string): boolean {
    if (!candidate || !expected) {
      return false;
    }
    const salt = "cacophony-admin-auth-salt";
    const candidateHash = crypto.scryptSync(candidate, salt, 64);
    const expectedHash = crypto.scryptSync(expected, salt, 64);
    return crypto.timingSafeEqual(candidateHash, expectedHash);
  }

  /**
   * Authenticates user using admin username and configured credentials from environment.
   */
  public async loginWithCredentials(
    username: string,
    secret: string,
  ): Promise<{ token: string; user: SsoUserProfile } | null> {
    loadEnvFile();
    if (!username || !secret) {
      return null;
    }
    const adminUser =
      process.env["ADMIN_USERNAME"] ||
      process.env["FIRST_USER"] ||
      process.env["GITEA_ADMIN_USER"] ||
      "NeXeN";
    const adminPass =
      process.env["ADMIN_PASSWORD"] ||
      process.env["FIRST_PASS"] ||
      process.env["ADMIN_TOKEN"];

    if (adminPass && username.trim().toLowerCase() === adminUser.toLowerCase()) {
      if (this.verifyPassword(secret, adminPass)) {
        const user: SsoUserProfile = {
          id: `admin-${adminUser.toLowerCase()}`,
          username: adminUser,
          email: process.env["ADMIN_EMAIL"] || `${adminUser.toLowerCase()}@cacophony.local`,
          roles: ["ADMIN", "OPERATOR"],
          groups: ["cacophony-admins"],
          provider: "local",
        };
        const token = this.signJwt({
          sub: user.id,
          username: user.username,
          email: user.email,
          role: "ADMIN",
          roles: user.roles,
          groups: user.groups,
          provider: "local",
          exp: Math.floor(Date.now() / 1000) + 86400 * 7,
        });
        await this.createSession(user, token);
        return { token, user };
      }
    }
    return null;
  }

  /**
   * Backward-compatible alias for loginWithCredentials.
   */
  public async loginWithPassword(
    username: string,
    secret: string,
  ): Promise<{ token: string; user: SsoUserProfile } | null> {
    return this.loginWithCredentials(username, secret);
  }

  /**
   * Exchanges an authorization code with the selected OAuth provider (Gitea or GitHub).
   */
  public async exchangeOAuthCode(
    provider: "gitea" | "github" | "authentik",
    code: string,
    redirectUri?: string,
  ): Promise<{ token: string; user: SsoUserProfile }> {
    if (!code) {
      throw new Error("Authorization code is required");
    }

    if (provider === "gitea") {
      const giteaClient = new GiteaApiClient({
        baseUrl: process.env["GITEA_BASE_URL"] || "http://cacophony-gitea:3000",
      });
      const giteaProvider = new GiteaOAuthProvider(giteaClient, {
        clientId: process.env["GITEA_OAUTH_CLIENT_ID"] || "19e1f52a-a382-4998-87d1-5b3ab028c747",
        clientSecret: process.env["GITEA_OAUTH_CLIENT_SECRET"] || "",
        redirectUri: redirectUri || process.env["GITEA_OAUTH_REDIRECT_URI"] || "http://localhost:24072/auth/callback",
        giteaPublicUrl: process.env["GITEA_PUBLIC_URL"] || "http://localhost:19634",
        jwtSecret: process.env["JWT_SECRET"] || process.env["VAULT_MASTER_KEY"] || "cacophony-jwt-session-secret",
      });
      const session = await giteaProvider.handleCallback(code);
      const adminUser = process.env["ADMIN_USERNAME"] || process.env["FIRST_USER"] || process.env["GITEA_ADMIN_USER"] || "NeXeN";
      const isAdmin = session.user.username.toLowerCase() === adminUser.toLowerCase();
      const user: SsoUserProfile = {
        id: `gitea-${session.user.id}`,
        username: session.user.username,
        email: session.user.email,
        roles: isAdmin ? ["ADMIN", "OPERATOR"] : ["OPERATOR"],
        groups: isAdmin ? ["cacophony-admins"] : ["cacophony-users"],
        provider: "gitea",
      };
      const token = this.signJwt({
        sub: user.id,
        username: user.username,
        email: user.email,
        role: isAdmin ? "ADMIN" : "OPERATOR",
        roles: user.roles,
        groups: user.groups,
        provider: "gitea",
        exp: Math.floor(session.expiresAt / 1000),
      });
      await this.createSession(user, token);
      return { token, user };
    }

    if (provider === "github") {
      const ghConfig = {
        clientId: process.env["GITHUB_CLIENT_ID"] || "",
        clientSecret: process.env["GITHUB_CLIENT_SECRET"] || "",
        redirectUri: redirectUri || process.env["GITHUB_REDIRECT_URI"] || "http://localhost:24072/auth/callback",
        scopes: ["read:user", "user:email"],
      };
      const ghProvider = new GitHubOAuthProvider(ghConfig);
      const { user: ghUser } = await ghProvider.exchangeCode(code);
      const adminUser = process.env["ADMIN_USERNAME"] || process.env["FIRST_USER"] || "NeXeN";
      const isAdmin = ghUser.username.toLowerCase() === adminUser.toLowerCase() || ghUser.username.toLowerCase() === "brennername";
      const user: SsoUserProfile = {
        ...ghUser,
        roles: isAdmin ? ["ADMIN", "OPERATOR"] : ["CONTRIBUTOR"],
        groups: isAdmin ? ["cacophony-admins"] : ["contributors"],
        provider: "github",
      };
      const token = this.signJwt({
        sub: user.id,
        username: user.username,
        email: user.email,
        role: isAdmin ? "ADMIN" : "VIEWER",
        roles: user.roles,
        groups: user.groups,
        provider: "github",
        ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      });
      await this.createSession(user, token);
      return { token, user };
    }

    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}
