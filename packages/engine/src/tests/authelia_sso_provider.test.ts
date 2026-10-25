import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { AutheliaSsoProvider } from "../auth/AutheliaSsoProvider.js";
import type { AutheliaConfig } from "@cacophony/shared-types";

describe("AutheliaSsoProvider Test Suite", () => {
  const defaultConfig: AutheliaConfig = {
    portalUrl: "https://auth.example.com",
    forwardAuthEnabled: true,
    headerRemoteUser: "Remote-User",
    headerRemoteEmail: "Remote-Email",
    headerRemoteGroups: "Remote-Groups",
    headerRemoteName: "Remote-Name",
  };

  const jwtSecret = "test-authelia-secret-key-32-chars-min!";

  describe("Forward Auth Header Extraction", () => {
    it("should extract user, email, name, and groups from standard headers", () => {
      const provider = new AutheliaSsoProvider(defaultConfig, jwtSecret);
      const headers = {
        "remote-user": "alice",
        "remote-email": "alice@example.com",
        "remote-name": "Alice Developer",
        "remote-groups": "developers,cacophony-operators",
      };

      const user = provider.authenticateHeaders(headers);
      assert.ok(user);
      assert.equal(user.id, "authelia-alice");
      assert.equal(user.username, "alice");
      assert.equal(user.email, "alice@example.com");
      assert.equal(user.displayName, "Alice Developer");
      assert.deepEqual(user.groups, ["developers", "cacophony-operators"]);
      assert.ok(user.roles.includes("OPERATOR"));
      assert.ok(user.roles.includes("VIEWER"));
    });

    it("should map admin group to ADMIN and OPERATOR roles", () => {
      const provider = new AutheliaSsoProvider(defaultConfig, jwtSecret);
      const headers = {
        "Remote-User": "admin_user",
        "Remote-Groups": "admins,superusers",
      };

      const user = provider.authenticateHeaders(headers);
      assert.ok(user);
      assert.ok(user.roles.includes("ADMIN"));
      assert.ok(user.roles.includes("OPERATOR"));
      assert.ok(user.roles.includes("VIEWER"));
    });

    it("should return null when Remote-User header is missing", () => {
      const provider = new AutheliaSsoProvider(defaultConfig, jwtSecret);
      const headers = {
        "Remote-Email": "nobody@example.com",
        "Remote-Groups": "guests",
      };

      const user = provider.authenticateHeaders(headers);
      assert.equal(user, null);
    });

    it("should handle array header values gracefully", () => {
      const provider = new AutheliaSsoProvider(defaultConfig, jwtSecret);
      const headers = {
        "Remote-User": ["bob"],
        "Remote-Email": ["bob@example.com"],
        "Remote-Groups": ["devs,viewers"],
      };

      const user = provider.authenticateHeaders(headers);
      assert.ok(user);
      assert.equal(user.username, "bob");
      assert.equal(user.email, "bob@example.com");
    });
  });

  describe("Authorization URL Generation", () => {
    it("should build proper redirect URL pointing to Authelia login portal", () => {
      const provider = new AutheliaSsoProvider(defaultConfig, jwtSecret);
      const url = provider.getAuthorizationUrl("state-xyz-123");

      assert.ok(url.startsWith("https://auth.example.com/?"));
      assert.ok(url.includes("rd=%2Fauth%2Fcallback"));
      assert.ok(url.includes("state=state-xyz-123"));
    });
  });

  describe("Token Verification", () => {
    it("should verify valid signed JWT token successfully", async () => {
      const provider = new AutheliaSsoProvider(defaultConfig, jwtSecret);

      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({
          sub: "user-123",
          username: "carol",
          email: "carol@example.com",
          roles: ["OPERATOR"],
          groups: ["engineers"],
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url");
      const signature = crypto
        .createHmac("sha256", jwtSecret)
        .update(`${header}.${payload}`)
        .digest("base64url");

      const token = `${header}.${payload}.${signature}`;
      const result = await provider.verifyToken(token);

      assert.equal(result.valid, true);
      assert.ok(result.user);
      assert.equal(result.user.username, "carol");
      assert.equal(result.user.email, "carol@example.com");
    });

    it("should reject expired token", async () => {
      const provider = new AutheliaSsoProvider(defaultConfig, jwtSecret);

      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({
          sub: "user-old",
          username: "old_user",
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        }),
      ).toString("base64url");
      const signature = crypto
        .createHmac("sha256", jwtSecret)
        .update(`${header}.${payload}`)
        .digest("base64url");

      const token = `${header}.${payload}.${signature}`;
      const result = await provider.verifyToken(token);

      assert.equal(result.valid, false);
      assert.equal(result.error, "Token expired");
    });

    it("should reject token with invalid signature", async () => {
      const provider = new AutheliaSsoProvider(defaultConfig, jwtSecret);

      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({
          sub: "tampered-user",
          username: "hacker",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url");
      const bogusSignature = "bad_signature_abc_123";

      const token = `${header}.${payload}.${bogusSignature}`;
      const result = await provider.verifyToken(token);

      assert.equal(result.valid, false);
      assert.equal(result.error, "Invalid signature");
    });

    it("should reject empty or malformed tokens", async () => {
      const provider = new AutheliaSsoProvider(defaultConfig, jwtSecret);

      const emptyRes = await provider.verifyToken("");
      assert.equal(emptyRes.valid, false);

      const malformedRes = await provider.verifyToken("not.a.valid.jwt.token");
      assert.equal(malformedRes.valid, false);
    });
  });

  describe("Code Exchange and User Profile", () => {
    it("should exchange code and return profile", async () => {
      const provider = new AutheliaSsoProvider(defaultConfig, jwtSecret);
      const exchange = await provider.exchangeCode("mock-code");

      assert.ok(exchange.accessToken.startsWith("authelia-session-"));
      assert.ok(exchange.user);
      assert.equal(exchange.user.provider, "authelia");
    });
  });
});
