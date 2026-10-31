import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { JwtValidator } from "../auth/JwtValidator.js";
import type { SsoSessionPayload } from "@cacophony/shared-types";

describe("JwtValidator Unit Test Suite (T102.2.5)", () => {
  const secret = "test-jwt-secret-key-super-secure-123456789";
  const validator = new JwtValidator({ hmacSecret: secret });

  const createBasePayload = (
    overrides?: Partial<SsoSessionPayload> & Record<string, unknown>,
  ): SsoSessionPayload => ({
    sub: "user-123",
    username: "testuser",
    email: "test@example.com",
    roles: ["contributor"],
    provider: "github",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  });

  it("should successfully sign and validate a valid HS256 session token", async () => {
    const payload = createBasePayload();
    const token = validator.signHs256(payload);

    assert.ok(token);
    assert.equal(token.split(".").length, 3);

    const result = await validator.validate(token);
    assert.strictEqual(result.valid, true);
    assert.ok(result.payload);
    assert.strictEqual(result.payload.sub, "user-123");
    assert.strictEqual(result.payload.username, "testuser");
    assert.deepStrictEqual(result.payload.roles, ["contributor"]);
  });

  it("should reject token with tampered signature", async () => {
    const payload = createBasePayload();
    const token = validator.signHs256(payload);
    const parts = token.split(".");
    const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignature123`;

    const result = await validator.validate(tamperedToken);
    assert.strictEqual(result.valid, false);
    assert.match(result.error ?? "", /signature/i);
  });

  it("should reject token when signed with a different secret", async () => {
    const differentValidator = new JwtValidator({ hmacSecret: "different-secret-999" });
    const payload = createBasePayload();
    const token = differentValidator.signHs256(payload);

    const result = await validator.validate(token);
    assert.strictEqual(result.valid, false);
    assert.match(result.error ?? "", /signature/i);
  });

  it("should reject expired token based on exp timestamp claim", async () => {
    const expiredTimestampSeconds = Math.floor(Date.now() / 1000) - 300;
    const payload = createBasePayload({
      exp: expiredTimestampSeconds,
    });
    const token = validator.signHs256(payload);

    const result = await validator.validate(token);
    assert.strictEqual(result.valid, false);
    assert.match(result.error ?? "", /expired/i);
  });

  it("should respect clock tolerance when validating slightly expired tokens", async () => {
    const expiredTimestampSeconds = Math.floor(Date.now() / 1000) - 10;
    const payload = createBasePayload({
      exp: expiredTimestampSeconds,
    });
    const token = validator.signHs256(payload);

    const resultWithTolerance = await validator.validate(token, {
      clockToleranceSeconds: 30,
    });
    assert.strictEqual(resultWithTolerance.valid, true);

    const resultWithoutTolerance = await validator.validate(token, {
      clockToleranceSeconds: 0,
    });
    assert.strictEqual(resultWithoutTolerance.valid, false);
  });

  it("should reject token when nbf not-before claim is in the future", async () => {
    const futureTimestampSeconds = Math.floor(Date.now() / 1000) + 300;
    const payload = createBasePayload({
      nbf: futureTimestampSeconds,
    } as any);
    const token = validator.signHs256(payload);

    const result = await validator.validate(token, { clockToleranceSeconds: 0 });
    assert.strictEqual(result.valid, false);
    assert.match(result.error ?? "", /not valid before/i);
  });

  it("should reject malformed tokens with incorrect segment counts or empty segments", async () => {
    const emptyResult = await validator.validate("");
    assert.strictEqual(emptyResult.valid, false);

    const twoPart = await validator.validate("header.payload");
    assert.strictEqual(twoPart.valid, false);

    const fourPart = await validator.validate("part1.part2.part3.part4");
    assert.strictEqual(fourPart.valid, false);

    const emptySegment = await validator.validate("..signature");
    assert.strictEqual(emptySegment.valid, false);
  });

  it("should reject tokens with invalid JSON in header or payload", async () => {
    const invalidHeader = Buffer.from("not-valid-json").toString("base64url");
    const payload = Buffer.from(JSON.stringify({ userId: "1" })).toString("base64url");
    const signature = "fake-sig";

    const result = await validator.validate(`${invalidHeader}.${payload}.${signature}`);
    assert.strictEqual(result.valid, false);
    assert.match(result.error ?? "", /decode/i);
  });

  it("should reject HS256 tokens when validator has no hmacSecret configured", async () => {
    const unconfiguredValidator = new JwtValidator();
    const payload = createBasePayload();
    const token = validator.signHs256(payload);

    const result = await unconfiguredValidator.validate(token);
    assert.strictEqual(result.valid, false);
    assert.match(result.error ?? "", /No HMAC secret/i);
  });

  it("should validate and enforce expectedIssuer, expectedAudience, and expectedNonce", async () => {
    const payload = createBasePayload({
      iss: "https://auth.cacophony.local",
      aud: "cacophony-client",
      nonce: "nonce-xyz",
    } as any);
    const token = validator.signHs256(payload);

    const validResult = await validator.validate(token, {
      expectedIssuer: "https://auth.cacophony.local",
      expectedAudience: "cacophony-client",
      expectedNonce: "nonce-xyz",
    });
    assert.strictEqual(validResult.valid, true);

    const badIssuer = await validator.validate(token, {
      expectedIssuer: "https://wrong.issuer",
    });
    assert.strictEqual(badIssuer.valid, false);
    assert.match(badIssuer.error ?? "", /issuer mismatch/i);

    const badAudience = await validator.validate(token, {
      expectedAudience: "wrong-audience",
    });
    assert.strictEqual(badAudience.valid, false);
    assert.match(badAudience.error ?? "", /audience mismatch/i);

    const badNonce = await validator.validate(token, {
      expectedNonce: "wrong-nonce",
    });
    assert.strictEqual(badNonce.valid, false);
    assert.match(badNonce.error ?? "", /nonce mismatch/i);
  });
});
