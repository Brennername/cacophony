import type { ISsoProvider } from "./ISsoProvider.js";
import { AuthentikOAuthProvider } from "./AuthentikOAuthProvider.js";
import { AutheliaSsoProvider } from "./AutheliaSsoProvider.js";
import { GiteaSsoAdapter } from "./GiteaSsoAdapter.js";
import { LocalBypassSsoProvider } from "./LocalBypassSsoProvider.js";
import { GiteaOAuthProvider } from "../gitea/GiteaOAuthProvider.js";
import { GiteaApiClient } from "../gitea/GiteaApiClient.js";
import type { AuthConfig, SsoProviderType } from "@cacophony/shared-types";

/**
 * Factory for creating and selecting the active SSO provider based on environment and config.
 */
export class SsoProviderFactory {
  /**
   * Creates an ISsoProvider instance matching the requested provider type.
   */
  public static createProvider(config?: Partial<AuthConfig>): ISsoProvider {
    const providerType: SsoProviderType = (config?.activeProvider ||
      process.env["SSO_PROVIDER"] ||
      "authentik") as SsoProviderType;

    const jwtSecret = config?.jwtSecret || process.env["VAULT_MASTER_KEY"] || "cacophony-jwt-session-secret";

    switch (providerType) {
      case "authentik": {
        const authentikConfig = {
          issuerUrl:
            config?.authentik?.issuerUrl ||
            process.env["AUTHENTIK_ISSUER_URL"] ||
            "http://localhost:9000/application/o/cacophony/",
          clientId:
            config?.authentik?.clientId ||
            process.env["AUTHENTIK_OAUTH_CLIENT_ID"] ||
            "cacophony-client",
          clientSecret:
            config?.authentik?.clientSecret ||
            process.env["AUTHENTIK_OAUTH_CLIENT_SECRET"] ||
            "",
          redirectUri:
            config?.authentik?.redirectUri ||
            process.env["AUTHENTIK_OAUTH_REDIRECT_URI"] ||
            "http://localhost:24072/auth/callback",
          scopes: config?.authentik?.scopes || ["openid", "profile", "email", "groups"]
        };
        return new AuthentikOAuthProvider(authentikConfig, jwtSecret);
      }

      case "authelia": {
        const autheliaConfig = {
          portalUrl:
            config?.authelia?.portalUrl ||
            process.env["AUTHELIA_PORTAL_URL"] ||
            "http://localhost:9091/",
          forwardAuthEnabled:
            config?.authelia?.forwardAuthEnabled ??
            (process.env["AUTHELIA_FORWARD_AUTH_ENABLED"] !== "false"),
          headerRemoteUser: config?.authelia?.headerRemoteUser || "Remote-User",
          headerRemoteEmail: config?.authelia?.headerRemoteEmail || "Remote-Email",
          headerRemoteGroups: config?.authelia?.headerRemoteGroups || "Remote-Groups",
          headerRemoteName: config?.authelia?.headerRemoteName || "Remote-Name"
        };
        return new AutheliaSsoProvider(autheliaConfig, jwtSecret);
      }

      case "gitea": {
        const giteaClient = new GiteaApiClient({
          baseUrl: process.env["GITEA_BASE_URL"] || "http://cacophony-gitea:3000"
        });
        const giteaProvider = new GiteaOAuthProvider(giteaClient, {
          clientId: process.env["GITEA_OAUTH_CLIENT_ID"] || "cacophony-dashboard",
          clientSecret: process.env["GITEA_OAUTH_CLIENT_SECRET"] || "",
          redirectUri: process.env["GITEA_OAUTH_REDIRECT_URI"] || "http://localhost:24072/auth/callback",
          giteaPublicUrl: process.env["GITEA_PUBLIC_URL"] || "http://localhost:19634",
          jwtSecret
        });
        return new GiteaSsoAdapter(giteaProvider);
      }

      case "local":
      default:
        return new LocalBypassSsoProvider();
    }
  }
}
