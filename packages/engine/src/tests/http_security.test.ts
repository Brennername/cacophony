// packages/engine/src/tests/http_security.test.ts

import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";
import { RateLimiter } from "../daemon/RateLimiter.js";
import type { IncomingMessage } from "node:http";

describe("T74.1.5: HTTP Security Hardening (CORS Allowlist, Tightened CSP, Security Headers, and Rate Limiter)", () => {
  let tempDir: string;
  let daemon: CacophonyDaemon;
  const testHttpPort = 24208;
  const testSocket = path.join(
    os.tmpdir(),
    `test-sec-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`,
  );

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-sec-"));
    const distMock = path.join(tempDir, "dist");
    await fs.mkdir(distMock, { recursive: true });
    await fs.writeFile(
      path.join(distMock, "index.html"),
      "<!doctype html><html><body>Secure App</body></html>",
      "utf-8",
    );

    daemon = new CacophonyDaemon({
      dbPath: path.join(tempDir, "test_db"),
      socketPath: testSocket,
      httpPort: testHttpPort,
      httpHost: "127.0.0.1",
      frontendDistPath: distMock,
      startScheduler: false,
    });

    await daemon.start();
  });

  after(async () => {
    await daemon.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
    try {
      await fs.unlink(testSocket);
    } catch {
      // ignore
    }
  });

  it("should validate and allow localhost, loopback, RFC 1918 LAN, and reject untrusted origins via resolveAllowedOrigin", () => {
    const server = daemon.getHttpServer();
    assert.ok(server);

    // Loopback origins
    assert.equal(
      server.resolveAllowedOrigin("http://localhost:4200"),
      "http://localhost:4200",
    );
    assert.equal(
      server.resolveAllowedOrigin("http://127.0.0.1:24161"),
      "http://127.0.0.1:24161",
    );
    assert.equal(
      server.resolveAllowedOrigin("http://[::1]:24161"),
      "http://[::1]:24161",
    );

    // RFC 1918 LAN origins
    assert.equal(
      server.resolveAllowedOrigin("http://192.168.1.100:4200"),
      "http://192.168.1.100:4200",
    );
    assert.equal(
      server.resolveAllowedOrigin("http://10.0.0.5:8080"),
      "http://10.0.0.5:8080",
    );
    assert.equal(
      server.resolveAllowedOrigin("http://172.20.0.2:3000"),
      "http://172.20.0.2:3000",
    );

    // mDNS and intranet domains
    assert.equal(
      server.resolveAllowedOrigin("http://cacophony.local:24161"),
      "http://cacophony.local:24161",
    );
    assert.equal(
      server.resolveAllowedOrigin("http://cluster.internal:24161"),
      "http://cluster.internal:24161",
    );

    // Untrusted external origins must be rejected (return null)
    assert.equal(server.resolveAllowedOrigin("https://evil-attacker.com"), null);
    assert.equal(server.resolveAllowedOrigin("http://malicious.org"), null);
    assert.equal(server.resolveAllowedOrigin(undefined), null);
  });

  it("should return standard security headers and omit unsafe-eval in CSP", async () => {
    const res = await fetch(`http://127.0.0.1:${testHttpPort}/api/status`);
    assert.equal(res.status, 200);

    const headers = res.headers;
    assert.equal(headers.get("x-content-type-options"), "nosniff");
    assert.equal(headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(
      headers.get("referrer-policy"),
      "strict-origin-when-cross-origin",
    );
    assert.equal(
      headers.get("permissions-policy"),
      "camera=(), microphone=(), geolocation=()",
    );

    const csp = headers.get("content-security-policy") || "";
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(!csp.includes("'unsafe-eval'"));
  });

  it("should echo allowed origin in CORS and reject untrusted preflight OPTIONS with 403", async () => {
    // Allowed preflight
    const allowedRes = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/status`,
      {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:4200",
          "Access-Control-Request-Method": "GET",
        },
      },
    );
    assert.equal(allowedRes.status, 204);
    assert.equal(
      allowedRes.headers.get("access-control-allow-origin"),
      "http://localhost:4200",
    );

    // Untrusted preflight
    const untrustedRes = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/status`,
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://evil-attacker.com",
          "Access-Control-Request-Method": "GET",
        },
      },
    );
    assert.equal(untrustedRes.status, 403);
    assert.equal(untrustedRes.headers.get("access-control-allow-origin"), null);
  });

  it("should enforce token-bucket rate limiter and return 429 when burst limit exceeded", () => {
    const limiter = new RateLimiter({
      maxTokens: 3,
      refillRatePerSecond: 1,
    });

    const mockReq = {
      socket: { remoteAddress: "192.168.1.200" },
      headers: {},
      method: "GET",
    } as unknown as IncomingMessage;

    // First 3 requests consume burst capacity
    assert.equal(limiter.allowRequest(mockReq), true);
    assert.equal(limiter.allowRequest(mockReq), true);
    assert.equal(limiter.allowRequest(mockReq), true);

    // 4th request exceeds burst capacity and is rejected
    assert.equal(limiter.allowRequest(mockReq), false);
    assert.ok(limiter.getRetryAfterSeconds(mockReq) >= 1);

    limiter.stop();
  });
});
