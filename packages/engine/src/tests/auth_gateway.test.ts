import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../auth/AuthService.js";

describe("AuthGateway Integration Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env["ADMIN_USERNAME"] = "NeXeN";
    process.env["ADMIN_PASSWORD"] = "cacophony-admin-secret-2026";
    process.env["FIRST_USER"] = "NeXeN";
    process.env["FIRST_PASS"] = "cacophony-admin-secret-2026";
    process.env["VAULT_MASTER_KEY"] = "92705ffac1fc86dc2d7b8ac042da9da93ada1c868c4c7385b780c10182a1bd1e";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should authenticate admin user with valid password and sign valid JWT", async () => {
    const authService = new AuthService();
    const result = await authService.loginWithCredentials("NeXeN", "cacophony-admin-secret-2026");

    assert.ok(result, "Expected login result to be non-null");
    assert.strictEqual(result.user.username, "NeXeN");
    assert.strictEqual(result.user.roles.includes("ADMIN"), true);
    assert.ok(result.token, "Expected valid token string");

    // Verify token can be authenticated
    const authCtx = await authService.authenticateToken(result.token);
    assert.ok(authCtx, "Expected authenticated authContext");
    assert.strictEqual(authCtx.username, "NeXeN");
    assert.strictEqual(authCtx.role, "ADMIN");
    assert.strictEqual(authService.isAuthorized(authCtx, "ADMIN"), true);
  });

  it("should reject login with incorrect password", async () => {
    const authService = new AuthService();
    const result = await authService.loginWithCredentials("NeXeN", "wrong-password");
    assert.strictEqual(result, null);
  });

  it("should reject login with unknown username", async () => {
    const authService = new AuthService();
    const result = await authService.loginWithCredentials("unknown_user", "cacophony-admin-secret-2026");
    assert.strictEqual(result, null);
  });

  it("should reject empty username or password", async () => {
    const authService = new AuthService();
    assert.strictEqual(await authService.loginWithCredentials("", "cacophony-admin-secret-2026"), null);
    assert.strictEqual(await authService.loginWithCredentials("NeXeN", ""), null);
  });
});
