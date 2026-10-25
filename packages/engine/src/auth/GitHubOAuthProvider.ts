import type { ISsoProvider, SsoValidationResult } from "./ISsoProvider.js";
import type {
  SsoUserProfile,
  GitHubOAuthConfig,
} from "@cacophony/shared-types";

/**
 * GitHubOAuthProvider
 *
 * Implements standard OAuth 2.0 web application flow for GitHub login (Phase S2 T-S2.1).
 * Completely free tier integration using public GitHub OAuth applications with
 * no recurring API or per-user seat costs.
 */
export class GitHubOAuthProvider implements ISsoProvider {
  public readonly providerType = "github" as const;
  private readonly config: GitHubOAuthConfig;

  constructor(config: GitHubOAuthConfig) {
    this.config = config;
  }

  /**
   * Generates authorization URL for redirecting users to GitHub OAuth authorization.
   * Throws an error if clientId is missing or unconfigured to prevent broken 404 redirects.
   */
  public getAuthorizationUrl(state: string): string {
    if (!this.config.clientId || !this.config.clientId.trim()) {
      throw new Error(
        "GitHub OAuth is not configured: clientId is missing. Configure GITHUB_CLIENT_ID in .env",
      );
    }
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(" "),
      state,
      allow_signup: "true",
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchanges an authorization code for GitHub access token and user profile.
   * Verifies required credentials prior to making the network token request.
   */
  public async exchangeCode(
    code: string,
  ): Promise<{ readonly accessToken: string; readonly user: SsoUserProfile }> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        "GitHub OAuth credentials missing: both clientId and clientSecret are required for code exchange",
      );
    }
    const tokenUrl = "https://github.com/login/oauth/access_token";
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub OAuth token exchange failed (${response.status})`);
    }

    const data = (await response.json()) as any;
    if (data.error || !data.access_token) {
      throw new Error(
        `GitHub OAuth error: ${data.error_description || data.error || "Missing access token"}`,
      );
    }

    const accessToken = data.access_token as string;
    const user = await this.getUserProfile(accessToken);
    return { accessToken, user };
  }

  /**
   * Fetches GitHub user profile and primary email.
   */
  public async getUserProfile(accessToken: string): Promise<SsoUserProfile> {
    const headers = {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Cacophony-GitHub-OAuth",
    };

    const userRes = await fetch("https://api.github.com/user", { headers });
    if (!userRes.ok) {
      throw new Error(`Failed to fetch GitHub user (${userRes.status})`);
    }

    const ghUser = (await userRes.json()) as any;

    let email = ghUser.email || "";
    if (!email) {
      try {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers,
        });
        if (emailsRes.ok) {
          const emails = (await emailsRes.json()) as any[];
          const primary = emails.find((e) => e.primary) || emails[0];
          email = primary?.email || "";
        }
      } catch {
        // non-fatal
      }
    }

    return {
      id: String(ghUser.id),
      username: ghUser.login,
      email: email || `${ghUser.login}@users.noreply.github.com`,
      roles: ["VIEWER"],
      groups: ["github-contributors"],
      provider: "github",
      avatarUrl: ghUser.avatar_url,
    };
  }

  /**
   * Verifies access token by probing GitHub API.
   */
  public async verifyToken(token: string): Promise<SsoValidationResult> {
    try {
      const user = await this.getUserProfile(token);
      return { valid: true, user };
    } catch (err: unknown) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
