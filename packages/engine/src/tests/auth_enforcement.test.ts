// packages/engine/src/tests/auth_enforcement.test.ts

import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as crypto from "node:crypto";
import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

function createJwt(payload: Record<string, unknown>, secret: string): string {
  const headerB64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");
  return `${headerB64}.${payloadB64}.${sig}`;
}

describe("T74.2: Authentication Enforcement and Role Restrictions on Mutating Routes", () => {
  let tempDir: string;
  let daemon: CacophonyDaemon;
  const testHttpPort = 24209;
  const testSocket = path.join(
    os.tmpdir(),
    `test-auth-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`,
  );
  const jwtSecret = "cacophony-test-jwt-secret-key-32bytes-len";

  let viewerToken: string;
  let operatorToken: string;
  let adminToken: string;

  before(async () => {
    process.env["REQUIRE_AUTH"] = "true";
    process.env["JWT_SECRET"] = jwtSecret;

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-auth-"));
    const distMock = path.join(tempDir, "dist");
    await fs.mkdir(distMock, { recursive: true });
    await fs.writeFile(
      path.join(distMock, "index.html"),
      "<!doctype html><html><body>Secure Cacophony</body></html>",
      "utf-8",
    );

    daemon = new CacophonyDaemon({
      dbPath: path.join(tempDir, "test_db"),
      socketPath: testSocket,
      httpPort: testHttpPort,
      httpHost: "127.0.0.1",
      frontendDistPath: distMock,
    });

    await daemon.start();

    viewerToken = createJwt(
      {
        sub: "user-viewer",
        username: "alice",
        roles: ["viewer"],
        groups: ["viewer"],
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      jwtSecret,
    );

    operatorToken = createJwt(
      {
        sub: "user-operator",
        username: "bob",
        roles: ["operator"],
        groups: ["developer"],
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      jwtSecret,
    );

    adminToken = createJwt(
      {
        sub: "user-admin",
        username: "charlie",
        roles: ["admin"],
        groups: ["cacophony-admins"],
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      jwtSecret,
    );
  });

  after(async () => {
    delete process.env["REQUIRE_AUTH"];
    delete process.env["JWT_SECRET"];
    delete process.env["NETWORK_MODE"];

    await daemon.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
    try {
      await fs.unlink(testSocket);
    } catch {
      // ignore
    }
  });

  it("should default REQUIRE_AUTH to true in lan_shared and reverse_proxy modes unless opted out", () => {
    const server = daemon.getHttpServer();
    assert.ok(server);

    delete process.env["REQUIRE_AUTH"];

    // In lan_shared mode -> defaults to true
    process.env["NETWORK_MODE"] = "lan_shared";
    assert.equal(server.isAuthRequired(), true);

    // In reverse_proxy mode -> defaults to true
    process.env["NETWORK_MODE"] = "reverse_proxy";
    assert.equal(server.isAuthRequired(), true);

    // Explicit opt-out -> returns false
    process.env["REQUIRE_AUTH"] = "false";
    assert.equal(server.isAuthRequired(), false);

    // Restore for remaining tests
    process.env["REQUIRE_AUTH"] = "true";
    assert.equal(server.isAuthRequired(), true);
  });

  it("should reject unauthenticated mutating requests with 401 Unauthorized", async () => {
    const res = await fetch(`http://127.0.0.1:${testHttpPort}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Unauthenticated Task" }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { error?: string };
    assert.ok(body.error?.includes("Unauthorized"));
  });

  it("should reject mutating requests with invalid token with 401 Unauthorized", async () => {
    const res = await fetch(`http://127.0.0.1:${testHttpPort}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid.token.payload",
      },
      body: JSON.stringify({ title: "Bad Token Task" }),
    });

    assert.equal(res.status, 401);
  });

  it("should reject mutating requests from VIEWER role with 403 Forbidden", async () => {
    // Attempt task creation with VIEWER token
    const postRes = await fetch(`http://127.0.0.1:${testHttpPort}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({ title: "Viewer Forbidden Task" }),
    });

    assert.equal(postRes.status, 403);
    const postBody = (await postRes.json()) as { error?: string };
    assert.ok(postBody.error?.includes("Forbidden"));

    // Attempt history deletion with VIEWER token
    const deleteRes = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/history`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${viewerToken}`,
        },
      },
    );

    assert.equal(deleteRes.status, 403);
  });

  it("should allow OPERATOR and ADMIN roles to pass mutating auth gate", async () => {
    const postRes = await fetch(`http://127.0.0.1:${testHttpPort}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        title: "Authorized Operator Task",
        prompt: "Run operator validation",
      }),
    });

    // Should not be rejected by auth gate (status is neither 401 nor 403)
    assert.notEqual(postRes.status, 401);
    assert.notEqual(postRes.status, 403);

    const adminDeleteRes = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/history`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    // ADMIN is authorized
    assert.notEqual(adminDeleteRes.status, 401);
    assert.notEqual(adminDeleteRes.status, 403);
  });

  it("should permit non-mutating GET requests regardless of mutating auth gate", async () => {
    const statusRes = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/status`,
    );
    assert.equal(statusRes.status, 200);

    const tasksRes = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/tasks`,
    );
    assert.equal(tasksRes.status, 200);
  });
});
