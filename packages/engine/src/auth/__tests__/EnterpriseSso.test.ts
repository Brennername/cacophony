import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { OidcDiscoveryService, JwksKeyManager } from "../OidcDiscoveryService.js";
import { JwtValidator } from "../JwtValidator.js";
import { AuthService } from "../AuthService.js";
import { UserSessionRepository } from "@cacophony/db";
import { PGliteDriver } from "@cacophony/db";
import { MigrationRunner } from "@cacophony/db";

describe("Phase 34: Enterprise SSO (Authentik, Authelia, Gitea OAuth2) & RBAC", () => {
  it("T34.1: should provide OIDC discovery configuration and parse endpoints", async () => {
    const discovery = new OidcDiscoveryService("http://localhost:9000/application/o/cacophony");
    const config = await discovery.getConfiguration();

    assert.ok(config.authorization_endpoint.includes("/authorize"));
    assert.ok(config.token_endpoint.includes("/token"));
    assert.ok(config.jwks_uri.includes("/jwks"));
  });

  it("T34.1: JwksKeyManager should handle key rotation and cache documents", async () => {
    const manager = new JwksKeyManager("http://localhost:9000/application/o/cacophony/jwks");
    const jwks = await manager.getJwks();
    assert.ok(Array.isArray(jwks.keys));
  });

  it("T34.2: JwtValidator should sign and verify HS256 tokens with claim checks", async () => {
    const secret = "unit-test-secret-key-phase34";
    const validator = new JwtValidator({ hmacSecret: secret });

    const now = Math.floor(Date.now() / 1000);
    const token = validator.signHs256({
      sub: "user-123",
      username: "alex_dev",
      email: "alex@company.org",
      roles: ["OPERATOR"],
      provider: "authentik",
      exp: now + 3600
    });

    const result = await validator.validate(token);
    assert.equal(result.valid, true);
    assert.equal(result.payload?.["username"], "alex_dev");
    assert.equal(result.payload?.["sub"], "user-123");
  });

  it("T34.2: JwtValidator should reject expired or tampered tokens", async () => {
    const secret = "unit-test-secret-key-phase34";
    const validator = new JwtValidator({ hmacSecret: secret });

    const now = Math.floor(Date.now() / 1000);
    const expiredToken = validator.signHs256({
      sub: "user-old",
      username: "old_dev",
      email: "old@company.org",
      roles: ["VIEWER"],
      provider: "authentik",
      exp: now - 3600
    });

    const expiredResult = await validator.validate(expiredToken);
    assert.equal(expiredResult.valid, false);
    assert.ok(expiredResult.error?.includes("Token expired"));

    const tampered = expiredToken.slice(0, -5) + "abcde";
    const tamperedResult = await validator.validate(tampered);
    assert.equal(tamperedResult.valid, false);
  });

  it("T34.3: UserSessionRepository should persist and retrieve encrypted sessions", async () => {
    const driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();

    const repo = new UserSessionRepository(driver);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

    await repo.saveSession({
      sessionId: "test-sess-001",
      userId: "usr-42",
      username: "alice",
      email: "alice@cacophony.local",
      role: "ADMIN",
      provider: "authentik",
      accessTokenEnc: "enc_access_token_data",
      refreshTokenEnc: "enc_refresh_token_data",
      expiresAt,
      createdAt: now,
      updatedAt: now
    });

    const retrieved = await repo.getSession("test-sess-001");
    assert.ok(retrieved);
    assert.equal(retrieved.username, "alice");
    assert.equal(retrieved.role, "ADMIN");
    assert.equal(retrieved.refreshTokenEnc, "enc_refresh_token_data");

    const deleted = await repo.deleteSession("test-sess-001");
    assert.equal(deleted, true);
    assert.equal(await repo.getSession("test-sess-001"), null);

    await driver.close();
  });

  it("T34.4: AuthService should resolve role hierarchy and enforce RBAC tiers", () => {
    const authService = new AuthService();

    assert.equal(authService.resolvePrimaryRole(["cacophony-admins"], []), "ADMIN");
    assert.equal(authService.resolvePrimaryRole(["developer"], []), "OPERATOR");
    assert.equal(authService.resolvePrimaryRole([], ["guests"]), "VIEWER");

    const adminCtx = {
      userId: "1",
      username: "admin",
      email: "a@b.com",
      role: "ADMIN" as const,
      provider: "authentik" as const,
      groups: []
    };
    const operatorCtx = {
      userId: "2",
      username: "op",
      email: "o@b.com",
      role: "OPERATOR" as const,
      provider: "authentik" as const,
      groups: []
    };
    const viewerCtx = {
      userId: "3",
      username: "view",
      email: "v@b.com",
      role: "VIEWER" as const,
      provider: "authentik" as const,
      groups: []
    };

    assert.equal(authService.isAuthorized(adminCtx, "ADMIN"), true);
    assert.equal(authService.isAuthorized(adminCtx, "OPERATOR"), true);
    assert.equal(authService.isAuthorized(operatorCtx, "OPERATOR"), true);
    assert.equal(authService.isAuthorized(operatorCtx, "ADMIN"), false);
    assert.equal(authService.isAuthorized(viewerCtx, "OPERATOR"), false);
    assert.equal(authService.isAuthorized(viewerCtx, "VIEWER"), true);
  });
});
