import { z } from "zod";

/**
 * SSO Provider types supported by Cacophony.
 */
export const SsoProviderTypeSchema = z.enum(["authentik", "authelia", "gitea", "local"]);
export type SsoProviderType = z.infer<typeof SsoProviderTypeSchema>;

/**
 * Authentik specific OIDC configuration schema.
 */
export const AuthentikConfigSchema = z.object({
  issuerUrl: z.string().url().default("http://localhost:9000/application/o/cacophony/"),
  clientId: z.string().default("cacophony-client"),
  clientSecret: z.string().default(""),
  redirectUri: z.string().url().default("http://localhost:24072/auth/callback"),
  scopes: z.array(z.string()).default(["openid", "profile", "email", "groups"]),
  tokenEndpoint: z.string().url().optional(),
  userinfoEndpoint: z.string().url().optional(),
  jwksUri: z.string().url().optional()
});
export type AuthentikConfig = z.infer<typeof AuthentikConfigSchema>;

/**
 * Authelia specific configuration schema.
 */
export const AutheliaConfigSchema = z.object({
  portalUrl: z.string().url().default("http://localhost:9091/"),
  forwardAuthEnabled: z.boolean().default(true),
  headerRemoteUser: z.string().default("Remote-User"),
  headerRemoteEmail: z.string().default("Remote-Email"),
  headerRemoteGroups: z.string().default("Remote-Groups"),
  headerRemoteName: z.string().default("Remote-Name")
});
export type AutheliaConfig = z.infer<typeof AutheliaConfigSchema>;

/**
 * Unified SSO Authentication Configuration Schema.
 */
export const AuthConfigSchema = z.object({
  activeProvider: SsoProviderTypeSchema.default("authentik"),
  sessionTtlSeconds: z.number().int().positive().default(86400),
  jwtSecret: z.string().default("cacophony-jwt-secret-session-key"),
  authentik: AuthentikConfigSchema.default({}),
  authelia: AutheliaConfigSchema.default({}),
  giteaPublicUrl: z.string().url().default("http://localhost:19634"),
  allowLocalEmergencyBypass: z.boolean().default(true)
});
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

export const UserRoleSchema = z.enum(["ADMIN", "OPERATOR", "VIEWER"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export interface AuthContext {
  readonly userId: string;
  readonly username: string;
  readonly email: string;
  readonly role: UserRole;
  readonly provider: SsoProviderType;
  readonly groups: readonly string[];
}

export interface OidcDiscoveryConfig {
  readonly issuer: string;
  readonly authorization_endpoint: string;
  readonly token_endpoint: string;
  readonly userinfo_endpoint?: string;
  readonly jwks_uri: string;
  readonly end_session_endpoint?: string;
  readonly response_types_supported?: readonly string[];
  readonly id_token_signing_alg_values_supported?: readonly string[];
}

export interface JwksKey {
  readonly kty: string;
  readonly kid?: string;
  readonly use?: string;
  readonly alg?: string;
  readonly n?: string;
  readonly e?: string;
  readonly x?: string;
  readonly y?: string;
  readonly crv?: string;
}

export interface JwksDocument {
  readonly keys: readonly JwksKey[];
}

/**
 * Standard user profile representation extracted from any SSO provider.
 */
export interface SsoUserProfile {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly displayName?: string;
  readonly groups: readonly string[];
  readonly roles: readonly string[];
  readonly provider: SsoProviderType;
}

/**
 * Signed user session token payload.
 */
export interface SsoSessionPayload {
  readonly sub: string;
  readonly username: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly provider: SsoProviderType;
  readonly exp: number;
}

