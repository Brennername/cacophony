import type { SsoUserProfile, SsoProviderType } from "@cacophony/shared-types";

/**
 * Result of validating an SSO token or session.
 */
export interface SsoValidationResult {
  readonly valid: boolean;
  readonly user?: SsoUserProfile;
  readonly error?: string;
}

/**
 * Standard interface for pluggable Enterprise SSO authentication providers.
 * Adheres to the Strategy and Interface Segregation design principles.
 */
export interface ISsoProvider {
  /** Provider identifier (authentik, authelia, gitea, local) */
  readonly providerType: SsoProviderType;

  /**
   * Generates authorization URL for redirecting user to login portal.
   * @param state Cryptographically random anti-CSRF state token
   */
  getAuthorizationUrl(state: string): string;

  /**
   * Exchanges an authorization code or forward-auth credential for user profile and token.
   * @param code Authorization code or forward-auth session token
   */
  exchangeCode(code: string): Promise<{ readonly accessToken: string; readonly user: SsoUserProfile }>;

  /**
   * Verifies an access token or session JWT.
   * @param token JWT or bearer access token
   */
  verifyToken(token: string): Promise<SsoValidationResult>;

  /**
   * Fetches full user profile details from SSO provider.
   * @param accessToken Access token acquired from exchangeCode
   */
  getUserProfile(accessToken: string): Promise<SsoUserProfile>;
}
