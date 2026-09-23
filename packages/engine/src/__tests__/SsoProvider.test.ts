import { describe, it } from "node:test";
import * as assert from "node:assert";
import { AuthentikOAuthProvider } from "../auth/AuthentikOAuthProvider.js";
import { AutheliaSsoProvider } from "../auth/AutheliaSsoProvider.js";
import { LocalBypassSsoProvider } from "../auth/LocalBypassSsoProvider.js";
import { SsoProviderFactory } from "../auth/SsoProviderFactory.js";
import type { AuthentikConfig, AutheliaConfig } from "@cacophony/shared-types";

describe("Phase 17: Enterprise SSO Provider Integration Tests", () => {
  const authentikConfig: AuthentikConfig = {
    issuerUrl: "http://localhost:9000/application/o/cacophony/",
    clientId: "cacophony-client-123",
    clientSecret: "client-secret-xyz",
    redirectUri: "http://localhost:24072/auth/callback",
    scopes: ["openid", "profile", "email", "groups"]
  };

  const autheliaConfig: AutheliaConfig = {
    portalUrl: "http://localhost:9091/",
    forwardAuthEnabled: true,
    headerRemoteUser: "Remote-User",
    headerRemoteEmail: "Remote-Email",
    headerRemoteGroups: "Remote-Groups",
    headerRemoteName: "Remote-Name"
  };

  const jwtSecret = "phase17-test-jwt-secret-key-32chars";

  describe("T17.1.3 & T17.2.3: AuthentikOAuthProvider OIDC Token Validation", () => {
    it("should generate correct authorization URL with scopes and anti-CSRF state", () => {
      const provider = new AuthentikOAuthProvider(authentikConfig, jwtSecret);
      const url = provider.getAuthorizationUrl("test-state-token");

      assert.ok(url.startsWith("http://localhost:9000/application/o/cacophony/authorize/"));
      assert.ok(url.includes("client_id=cacophony-client-123"));
      assert.ok(url.includes("state=test-state-token"));
      assert.ok(url.includes("scope=openid+profile+email+groups"));
    });

    it("should issue signed session token and verify validity with correct claims", async () => {
      const provider = new AuthentikOAuthProvider(authentikConfig, jwtSecret);
      const mockProfile = {
        id: "usr-auth-01",
        username: "dev_lead",
        email: "devlead@example.com",
        groups: ["cacophony-admins"],
        roles: ["ADMIN", "OPERATOR"],
        provider: "authentik" as const
      };

      const token = provider.issueSessionToken(mockProfile, 3600);
      assert.ok(token.split(".").length === 3);

      const verification = await provider.verifyToken(token);
      assert.strictEqual(verification.valid, true);
      assert.strictEqual(verification.user?.username, "dev_lead");
      assert.strictEqual(verification.user?.email, "devlead@example.com");
      assert.ok(verification.user?.roles.includes("ADMIN"));
    });

    it("should reject tampered or expired tokens gracefully", async () => {
      const provider = new AuthentikOAuthProvider(authentikConfig, jwtSecret);
      const mockProfile = {
        id: "usr-auth-02",
        username: "hacker",
        email: "hacker@example.com",
        groups: ["guests"],
        roles: ["VIEWER"],
        provider: "authentik" as const
      };

      // Token expired in past (-10 seconds)
      const expiredToken = provider.issueSessionToken(mockProfile, -10);
      const resExpired = await provider.verifyToken(expiredToken);
      assert.strictEqual(resExpired.valid, false);
      assert.strictEqual(resExpired.error, "Token expired");

      // Tampered signature
      const validToken = provider.issueSessionToken(mockProfile, 3600);
      const [h, p] = validToken.split(".");
      const tampered = `${h}.${p}.invalid_sig`;
      const resTampered = await provider.verifyToken(tampered);
      assert.strictEqual(resTampered.valid, false);
      assert.strictEqual(resTampered.error, "Signature verification failed");
    });
  });

  describe("T17.1.3 & T17.2.3: AutheliaSsoProvider Header Extraction", () => {
    it("should generate Authelia portal redirect URL", () => {
      const provider = new AutheliaSsoProvider(autheliaConfig, jwtSecret);
      const url = provider.getAuthorizationUrl("csrf-token-abc");

      assert.ok(url.startsWith("http://localhost:9091/?"));
      assert.ok(url.includes("rd="));
      assert.ok(url.includes("state=csrf-token-abc"));
    });

    it("should extract authenticated user profile from forward-auth headers", () => {
      const provider = new AutheliaSsoProvider(autheliaConfig, jwtSecret);
      const headers = {
        "remote-user": "bob_operator",
        "remote-email": "bob@example.com",
        "remote-groups": "cacophony-operators, developers",
        "remote-name": "Bob Operator"
      };

      const user = provider.authenticateHeaders(headers);
      assert.ok(user !== null);
      assert.strictEqual(user?.username, "bob_operator");
      assert.strictEqual(user?.email, "bob@example.com");
      assert.ok(user?.roles.includes("OPERATOR"));
    });

    it("should return null when remote-user header is absent", () => {
      const provider = new AutheliaSsoProvider(autheliaConfig, jwtSecret);
      const headers = {
        "content-type": "application/json"
      };

      const user = provider.authenticateHeaders(headers);
      assert.strictEqual(user, null);
    });
  });

  describe("T17.1.3 & T17.2.2: Local Emergency Bypass Provider", () => {
    it("should handle emergency bypass authentication for air-gapped recovery", async () => {
      const provider = new LocalBypassSsoProvider();
      const session = await provider.exchangeCode("emergency");

      assert.strictEqual(session.user.username, "cacophony_admin");
      assert.ok(session.user.roles.includes("ADMIN"));

      const verification = await provider.verifyToken(session.accessToken);
      assert.strictEqual(verification.valid, true);
      assert.strictEqual(verification.user?.username, "cacophony_admin");
    });
  });

  describe("T17.1.3.4: SsoProviderFactory Provider Resolution", () => {
    it("should instantiate AuthentikOAuthProvider by default or when configured", () => {
      const provider = SsoProviderFactory.createProvider({ activeProvider: "authentik" });
      assert.strictEqual(provider.providerType, "authentik");
    });

    it("should instantiate AutheliaSsoProvider when configured", () => {
      const provider = SsoProviderFactory.createProvider({ activeProvider: "authelia" });
      assert.strictEqual(provider.providerType, "authelia");
    });

    it("should instantiate LocalBypassSsoProvider when configured as local", () => {
      const provider = SsoProviderFactory.createProvider({ activeProvider: "local" });
      assert.strictEqual(provider.providerType, "local");
    });
  });
});
