import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { RateLimiter } from "../daemon/RateLimiter.js";

describe("RateLimiter Unit Test Suite (T102.2.4)", () => {
  const createMockRequest = (options: {
    method?: string;
    remoteAddress?: string;
    forwardedFor?: string;
  }): IncomingMessage => {
    return {
      method: options.method ?? "GET",
      headers: {
        ...(options.forwardedFor ? { "x-forwarded-for": options.forwardedFor } : {}),
      },
      socket: {
        remoteAddress: options.remoteAddress ?? "127.0.0.1",
      },
    } as unknown as IncomingMessage;
  };

  it("should allow initial burst up to configured capacity for read operations", () => {
    const limiter = new RateLimiter({
      maxTokens: 5,
      refillRatePerSecond: 1,
    });

    const req = createMockRequest({ method: "GET", remoteAddress: "192.168.1.10" });

    // Should allow 5 consecutive reads within the initial burst allowance
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(
        limiter.allowRequest(req),
        true,
        `Expected request ${i + 1} to be permitted`,
      );
    }

    // 6th read request exceeds burst capacity and should be rate-limited
    assert.strictEqual(limiter.allowRequest(req), false);

    limiter.stop();
  });

  it("should enforce separate stricter limits on mutating operations", () => {
    const limiter = new RateLimiter({
      maxTokens: 10,
      refillRatePerSecond: 5,
      maxMutatingTokens: 2,
      mutatingRefillRatePerSecond: 1,
    });

    const postReq = createMockRequest({
      method: "POST",
      remoteAddress: "192.168.1.20",
    });
    const getReq = createMockRequest({
      method: "GET",
      remoteAddress: "192.168.1.20",
    });

    // Mutating bucket has max 2 tokens
    assert.strictEqual(limiter.allowRequest(postReq), true);
    assert.strictEqual(limiter.allowRequest(postReq), true);
    // 3rd POST should fail
    assert.strictEqual(limiter.allowRequest(postReq), false);

    // Read bucket should still have its separate full capacity intact
    assert.strictEqual(limiter.allowRequest(getReq), true);
    assert.strictEqual(limiter.allowRequest(getReq), true);

    limiter.stop();
  });

  it("should extract client IP accurately from X-Forwarded-For header", () => {
    const limiter = new RateLimiter({
      maxTokens: 1,
      refillRatePerSecond: 1,
    });

    // Multi-hop proxy header: leftmost IP is client IP
    const reqProxy1 = createMockRequest({
      method: "GET",
      remoteAddress: "10.0.0.1",
      forwardedFor: "203.0.113.195, 70.41.3.18, 150.172.238.178",
    });

    const reqProxy2 = createMockRequest({
      method: "GET",
      remoteAddress: "10.0.0.1",
      forwardedFor: "198.51.100.4",
    });

    // Client 203.0.113.195 consumes its token
    assert.strictEqual(limiter.allowRequest(reqProxy1), true);
    assert.strictEqual(limiter.allowRequest(reqProxy1), false);

    // Client 198.51.100.4 should not be throttled by client 203.0.113.195
    assert.strictEqual(limiter.allowRequest(reqProxy2), true);

    limiter.stop();
  });

  it("should isolate rate limits across distinct client IP addresses", () => {
    const limiter = new RateLimiter({
      maxTokens: 1,
      refillRatePerSecond: 1,
    });

    const reqA = createMockRequest({ remoteAddress: "192.168.1.101" });
    const reqB = createMockRequest({ remoteAddress: "192.168.1.102" });

    assert.strictEqual(limiter.allowRequest(reqA), true);
    assert.strictEqual(limiter.allowRequest(reqA), false);

    // IP B has its own independent bucket
    assert.strictEqual(limiter.allowRequest(reqB), true);
    assert.strictEqual(limiter.allowRequest(reqB), false);

    limiter.stop();
  });

  it("should compute accurate Retry-After seconds header values", () => {
    const limiter = new RateLimiter({
      refillRatePerSecond: 20, // 1/20 = 0.05s -> ceil(0.05) = 1s
      mutatingRefillRatePerSecond: 2, // 1/2 = 0.5s -> ceil(0.5) = 1s
    });

    const getReq = createMockRequest({ method: "GET" });
    const postReq = createMockRequest({ method: "POST" });

    assert.strictEqual(limiter.getRetryAfterSeconds(getReq), 1);
    assert.strictEqual(limiter.getRetryAfterSeconds(postReq), 1);

    const slowLimiter = new RateLimiter({
      refillRatePerSecond: 0.2, // 1/0.2 = 5s
      mutatingRefillRatePerSecond: 0.1, // 1/0.1 = 10s
    });

    assert.strictEqual(slowLimiter.getRetryAfterSeconds(getReq), 5);
    assert.strictEqual(slowLimiter.getRetryAfterSeconds(postReq), 10);

    limiter.stop();
    slowLimiter.stop();
  });

  it("should clean up timers and state when stopped", () => {
    const limiter = new RateLimiter();
    limiter.start();
    // Subsequent start call should be idempotent
    limiter.start();

    const req = createMockRequest({ remoteAddress: "192.168.1.200" });
    limiter.allowRequest(req);

    limiter.stop();
    // Subsequent stop call should be idempotent
    limiter.stop();
  });
});
