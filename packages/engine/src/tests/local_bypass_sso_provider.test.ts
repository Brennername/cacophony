import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LocalBypassSsoProvider } from "../auth/LocalBypassSsoProvider.js";

describe("LocalBypassSsoProvider Test Suite (T102.7.3)", () => {
  const provider = new LocalBypassSsoProvider();

  describe("Provider Identity and Authorization", () => {
    it("should identify with providerType 'local'", () => {
      assert.strictEqual(provider.providerType, "local");
    });

    it("should format callback authorization URL with state parameter", () => {
      const state = "csrf-security-token-abc123";
      const url = provider.getAuthorizationUrl(state);

      assert.ok(url.startsWith("/auth/callback?code=emergency-local-bypass&state="));
      assert.ok(url.includes(encodeURIComponent(state)));
    });
  });

  describe("Code Exchange and Mock User Profile", () => {
    it("should exchange emergency code for bypass token and local admin profile", async () => {
      const exchange = await provider.exchangeCode("emergency-local-bypass");

      assert.strictEqual(exchange.accessToken, "local-emergency-bypass-token");
      assert.strictEqual(exchange.user.id, "local-admin-root");
      assert.strictEqual(exchange.user.username, "cacophony_admin");
      assert.strictEqual(exchange.user.email, "admin@cacophony.local");
      assert.strictEqual(exchange.user.provider, "local");
      assert.deepStrictEqual(exchange.user.roles, ["ADMIN", "OPERATOR", "VIEWER"]);
      assert.deepStrictEqual(exchange.user.groups, ["cacophony-admins"]);
    });

    it("should return the default admin profile via getUserProfile", async () => {
      const profile = await provider.getUserProfile("any-token");

      assert.strictEqual(profile.id, "local-admin-root");
      assert.strictEqual(profile.username, "cacophony_admin");
      assert.deepStrictEqual(profile.roles, ["ADMIN", "OPERATOR", "VIEWER"]);
    });
  });

  describe("Token Verification", () => {
    it("should validate the authentic emergency bypass token", async () => {
      const validation = await provider.verifyToken("local-emergency-bypass-token");

      assert.strictEqual(validation.valid, true);
      assert.ok(validation.user);
      assert.strictEqual(validation.user.username, "cacophony_admin");
      assert.deepStrictEqual(validation.user.roles, ["ADMIN", "OPERATOR", "VIEWER"]);
    });

    it("should reject invalid or malformed tokens", async () => {
      const validation = await provider.verifyToken("invalid-or-fake-token");

      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.user, undefined);
      assert.strictEqual(validation.error, "Invalid local bypass token");
    });
  });
});
