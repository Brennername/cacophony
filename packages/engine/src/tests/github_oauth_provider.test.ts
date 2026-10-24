import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GitHubOAuthProvider } from "../auth/GitHubOAuthProvider.js";
import { FirstRunBootstrapService } from "../daemon/FirstRunBootstrapService.js";
import { SQLiteDriver, UserSessionRepository, migration009 } from "@cacophony/db";

describe("GitHubOAuthProvider & Bootstrap Unit Tests", () => {
  const oauthConfig = {
    clientId: "mock-gh-client-id",
    clientSecret: "mock-gh-client-secret",
    redirectUri: "http://localhost:24072/auth/github/callback",
    scopes: ["read:user", "user:email"],
  };
  const provider = new GitHubOAuthProvider(oauthConfig);

  it("should generate proper GitHub authorization URL with anti-CSRF state", () => {
    const state = "random-csrf-token-12345";
    const authUrl = provider.getAuthorizationUrl(state);

    assert.ok(
      authUrl.startsWith("https://github.com/login/oauth/authorize?"),
    );
    assert.ok(authUrl.includes("client_id=mock-gh-client-id"));
    assert.ok(authUrl.includes("state=random-csrf-token-12345"));
    assert.ok(authUrl.includes("scope=read%3Auser+user%3Aemail"));
  });

  it("should verify admin bootstrap succeeds when admin credentials exist in env", async () => {
    const driver = new SQLiteDriver(":memory:");
    await driver.connect();
    await migration009.up(driver);
    const sessionRepo = new UserSessionRepository(driver);

    const bootstrap = new FirstRunBootstrapService(sessionRepo, {
      adminUsername: "NeXeN",
      adminPassword: "super-secure-master-password",
      adminEmail: "nexen@cacophony.local",
    });

    const result = await bootstrap.ensureAdminBootstrap();
    assert.equal(result.bootstrapped, true);
    assert.equal(result.adminUsername, "NeXeN");
    assert.equal(result.role, "ADMIN");
  });

  it("should skip bootstrap gracefully when credentials are not configured", async () => {
    const driver = new SQLiteDriver(":memory:");
    await driver.connect();
    await migration009.up(driver);
    const sessionRepo = new UserSessionRepository(driver);

    const bootstrap = new FirstRunBootstrapService(sessionRepo, {
      adminUsername: "NeXeN",
      adminPassword: "",
    });

    const result = await bootstrap.ensureAdminBootstrap();
    assert.equal(result.bootstrapped, false);
  });
});
