import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { OidcDiscoveryConfig, JwksDocument } from "@cacophony/shared-types";
import {
  OidcDiscoveryService,
  JwksKeyManager,
} from "../auth/OidcDiscoveryService.js";

describe("OidcDiscoveryService & JwksKeyManager Test Suite", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("OidcDiscoveryService", () => {
    it("should strip trailing slashes from issuerUrl", async () => {
      let requestedUrl = "";
      globalThis.fetch = async (url: string | URL | Request) => {
        requestedUrl = String(url);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            issuer: "https://auth.example.com",
            authorization_endpoint: "https://auth.example.com/oauth/authorize",
            token_endpoint: "https://auth.example.com/oauth/token",
            jwks_uri: "https://auth.example.com/oauth/jwks",
          }),
        } as unknown as Response;
      };

      const service = new OidcDiscoveryService("https://auth.example.com///", 10000);
      const config = await service.getConfiguration();

      assert.strictEqual(
        requestedUrl,
        "https://auth.example.com/.well-known/openid-configuration",
      );
      assert.strictEqual(config.issuer, "https://auth.example.com");
      assert.strictEqual(
        config.authorization_endpoint,
        "https://auth.example.com/oauth/authorize",
      );
    });

    it("should cache discovered configuration within TTL and avoid redundant network requests", async () => {
      let callCount = 0;
      globalThis.fetch = async () => {
        callCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            issuer: "https://auth.example.com",
            authorization_endpoint: "https://auth.example.com/authorize",
            token_endpoint: "https://auth.example.com/token",
            jwks_uri: "https://auth.example.com/jwks",
          }),
        } as unknown as Response;
      };

      const service = new OidcDiscoveryService("https://auth.example.com", 5000);

      const firstCall = await service.getConfiguration();
      const secondCall = await service.getConfiguration();

      assert.strictEqual(callCount, 1);
      assert.strictEqual(firstCall.issuer, secondCall.issuer);
    });

    it("should fall back to default synthetic endpoints on fetch failure when cache is empty", async () => {
      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 503,
        } as unknown as Response;
      };

      const service = new OidcDiscoveryService("https://idp.local", 1000);
      const config = await service.getConfiguration();

      assert.strictEqual(config.issuer, "https://idp.local");
      assert.strictEqual(config.authorization_endpoint, "https://idp.local/authorize");
      assert.strictEqual(config.token_endpoint, "https://idp.local/token");
      assert.strictEqual(config.jwks_uri, "https://idp.local/jwks");
    });

    it("should retain existing cached configuration when network request fails on refresh", async () => {
      let shouldFail = false;
      globalThis.fetch = async () => {
        if (shouldFail) {
          throw new Error("Network timeout");
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            issuer: "https://auth.example.com",
            authorization_endpoint: "https://auth.example.com/oauth2/v1/auth",
            token_endpoint: "https://auth.example.com/oauth2/v1/token",
            jwks_uri: "https://auth.example.com/oauth2/v1/keys",
          }),
        } as unknown as Response;
      };

      // 0ms TTL to force refresh on every call
      const service = new OidcDiscoveryService("https://auth.example.com", 0);
      const initial = await service.getConfiguration();
      assert.strictEqual(
        initial.authorization_endpoint,
        "https://auth.example.com/oauth2/v1/auth",
      );

      shouldFail = true;
      const cached = await service.getConfiguration();
      assert.strictEqual(
        cached.authorization_endpoint,
        "https://auth.example.com/oauth2/v1/auth",
      );
    });

    it("should allow manual configuration overrides and clearCache operations", async () => {
      const service = new OidcDiscoveryService("https://custom.local");
      const manualConfig: OidcDiscoveryConfig = {
        issuer: "https://custom.local",
        authorization_endpoint: "https://custom.local/auth",
        token_endpoint: "https://custom.local/tok",
        jwks_uri: "https://custom.local/keys",
      };

      service.setConfiguration(manualConfig);
      const retrieved = await service.getConfiguration();
      assert.strictEqual(retrieved.token_endpoint, "https://custom.local/tok");

      service.clearCache();

      globalThis.fetch = async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            issuer: "https://custom.local",
            authorization_endpoint: "https://custom.local/reloaded/auth",
            token_endpoint: "https://custom.local/reloaded/token",
            jwks_uri: "https://custom.local/reloaded/jwks",
          }),
        } as unknown as Response;
      };

      const reloaded = await service.getConfiguration();
      assert.strictEqual(reloaded.token_endpoint, "https://custom.local/reloaded/token");
    });
  });

  describe("JwksKeyManager", () => {
    const mockJwks: JwksDocument = {
      keys: [
        {
          kty: "RSA",
          use: "sig",
          alg: "RS256",
          kid: "key-rsa-sig-01",
          n: "mock-modulus-1",
          e: "AQAB",
        },
        {
          kty: "RSA",
          use: "enc",
          alg: "RSA-OAEP",
          kid: "key-rsa-enc-02",
          n: "mock-modulus-2",
          e: "AQAB",
        },
      ],
    };

    it("should fetch and parse JWKS document from uri", async () => {
      globalThis.fetch = async () => {
        return {
          ok: true,
          status: 200,
          json: async () => mockJwks,
        } as unknown as Response;
      };

      const manager = new JwksKeyManager("https://auth.example.com/jwks", 5000);
      const jwks = await manager.getJwks();

      assert.strictEqual(jwks.keys.length, 2);
      assert.strictEqual(jwks.keys[0]?.kid, "key-rsa-sig-01");
    });

    it("should retrieve key by explicit kid", async () => {
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => mockJwks,
      } as unknown as Response);

      const manager = new JwksKeyManager("https://auth.example.com/jwks");
      const key = await manager.getKey("key-rsa-enc-02");

      assert.ok(key);
      assert.strictEqual(key.kid, "key-rsa-enc-02");
      assert.strictEqual(key.use, "enc");
    });

    it("should default to the first signature key (use=sig) when no kid is specified", async () => {
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => mockJwks,
      } as unknown as Response);

      const manager = new JwksKeyManager("https://auth.example.com/jwks");
      const key = await manager.getKey();

      assert.ok(key);
      assert.strictEqual(key.kid, "key-rsa-sig-01");
      assert.strictEqual(key.use, "sig");
    });

    it("should return empty keys list when network fetch fails and cache is empty", async () => {
      globalThis.fetch = async () => {
        throw new Error("Connection refused");
      };

      const manager = new JwksKeyManager("https://bad.host/jwks");
      const jwks = await manager.getJwks();

      assert.deepStrictEqual(jwks, { keys: [] });
    });

    it("should invalidate cache and reload on next invocation", async () => {
      let callCount = 0;
      globalThis.fetch = async () => {
        callCount++;
        return {
          ok: true,
          status: 200,
          json: async () => mockJwks,
        } as unknown as Response;
      };

      const manager = new JwksKeyManager("https://auth.example.com/jwks", 60000);
      await manager.getJwks();
      assert.strictEqual(callCount, 1);

      manager.invalidate();
      await manager.getJwks();
      assert.strictEqual(callCount, 2);
    });
  });
});
