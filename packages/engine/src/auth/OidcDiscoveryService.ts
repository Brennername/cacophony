import type { OidcDiscoveryConfig, JwksDocument } from "@cacophony/shared-types";

/**
 * Service to dynamically discover and cache OpenID Connect endpoint configurations
 * from .well-known/openid-configuration.
 */
export class OidcDiscoveryService {
  private readonly issuerUrl: string;
  private cachedConfig: OidcDiscoveryConfig | null = null;
  private lastFetchTimeMs = 0;
  private readonly ttlMs: number;

  constructor(issuerUrl: string, ttlMs: number = 3600_000) {
    let cleanUrl = issuerUrl;
    while (cleanUrl.endsWith("/")) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    this.issuerUrl = cleanUrl;
    this.ttlMs = ttlMs;
  }

  /**
   * Retrieves the OIDC discovery configuration, utilizing memory cache when valid.
   */
  public async getConfiguration(): Promise<OidcDiscoveryConfig> {
    const now = Date.now();
    if (this.cachedConfig && now - this.lastFetchTimeMs < this.ttlMs) {
      return this.cachedConfig;
    }

    const wellKnownUrl = `${this.issuerUrl}/.well-known/openid-configuration`;
    try {
      const res = await fetch(wellKnownUrl, {
        headers: { Accept: "application/json" }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch OIDC configuration from ${wellKnownUrl}: HTTP ${res.status}`);
      }
      const data = (await res.json()) as OidcDiscoveryConfig;
      this.cachedConfig = data;
      this.lastFetchTimeMs = now;
      return data;
    } catch (err: unknown) {
      if (this.cachedConfig) {
        return this.cachedConfig;
      }
      // Provide intelligent fallback defaults conforming to standard OIDC endpoints
      const fallbackConfig: OidcDiscoveryConfig = {
        issuer: this.issuerUrl,
        authorization_endpoint: `${this.issuerUrl}/authorize`,
        token_endpoint: `${this.issuerUrl}/token`,
        userinfo_endpoint: `${this.issuerUrl}/userinfo`,
        jwks_uri: `${this.issuerUrl}/jwks`,
        end_session_endpoint: `${this.issuerUrl}/end-session`
      };
      this.cachedConfig = fallbackConfig;
      this.lastFetchTimeMs = now;
      return fallbackConfig;
    }
  }

  /**
   * Manually sets or overrides configuration (useful for testing or direct configuration).
   */
  public setConfiguration(config: OidcDiscoveryConfig): void {
    this.cachedConfig = config;
    this.lastFetchTimeMs = Date.now();
  }

  /**
   * Clears the cached configuration.
   */
  public clearCache(): void {
    this.cachedConfig = null;
    this.lastFetchTimeMs = 0;
  }
}

/**
 * Manager responsible for fetching, parsing, and caching JSON Web Key Sets (JWKS).
 */
export class JwksKeyManager {
  private readonly jwksUri: string;
  private cachedJwks: JwksDocument | null = null;
  private lastFetchTimeMs = 0;
  private readonly ttlMs: number;

  constructor(jwksUri: string, ttlMs: number = 3600_000) {
    this.jwksUri = jwksUri;
    this.ttlMs = ttlMs;
  }

  /**
   * Fetches and caches the JWKS document.
   */
  public async getJwks(): Promise<JwksDocument> {
    const now = Date.now();
    if (this.cachedJwks && now - this.lastFetchTimeMs < this.ttlMs) {
      return this.cachedJwks;
    }

    try {
      const res = await fetch(this.jwksUri, {
        headers: { Accept: "application/json" }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch JWKS from ${this.jwksUri}: HTTP ${res.status}`);
      }
      const data = (await res.json()) as JwksDocument;
      this.cachedJwks = data;
      this.lastFetchTimeMs = now;
      return data;
    } catch (err: unknown) {
      if (this.cachedJwks) {
        return this.cachedJwks;
      }
      return { keys: [] };
    }
  }

  /**
   * Finds a matching key by kid or returns the first key matching use='sig'.
   */
  public async getKey(kid?: string): Promise<JwksDocument["keys"][number] | undefined> {
    const jwks = await this.getJwks();
    if (kid) {
      return jwks.keys.find((k) => k.kid === kid);
    }
    return jwks.keys.find((k) => !k.use || k.use === "sig") || jwks.keys[0];
  }

  /**
   * Invalidate cached JWKS keys to force immediate reload on next call.
   */
  public invalidate(): void {
    this.cachedJwks = null;
    this.lastFetchTimeMs = 0;
  }
}
