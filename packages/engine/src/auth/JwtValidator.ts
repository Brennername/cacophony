import * as crypto from "node:crypto";
import type { JwksKeyManager } from "./OidcDiscoveryService.js";
import type { SsoSessionPayload } from "@cacophony/shared-types";

export interface JwtValidationOptions {
  readonly expectedIssuer?: string;
  readonly expectedAudience?: string;
  readonly clockToleranceSeconds?: number;
  readonly expectedNonce?: string;
}

export interface JwtValidationResult {
  readonly valid: boolean;
  readonly payload?: Record<string, unknown>;
  readonly error?: string;
}

/**
 * Validates JSON Web Tokens using standard Node.js crypto primitives.
 * Supports RS256/ES256 verification against dynamic JWKS keys, and HS256 HMAC tokens.
 */
export class JwtValidator {
  private readonly jwksKeyManager: JwksKeyManager | undefined;
  private readonly hmacSecret: string | undefined;

  constructor(options?: { jwksKeyManager?: JwksKeyManager | undefined; hmacSecret?: string | undefined }) {
    this.jwksKeyManager = options?.jwksKeyManager;
    this.hmacSecret = options?.hmacSecret;
  }

  /**
   * Validates a JWT string and verifies its signature and claims.
   */
  public async validate(
    token: string,
    options?: JwtValidationOptions
  ): Promise<JwtValidationResult> {
    if (!token || typeof token !== "string") {
      return { valid: false, error: "Empty or invalid token format" };
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Invalid JWT structure: expected 3 dot-separated segments" };
    }

    const headerB64 = parts[0];
    const payloadB64 = parts[1];
    const signatureB64 = parts[2];
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return { valid: false, error: "Invalid JWT structure: segment is empty" };
    }

    let header: { alg?: string; kid?: string; typ?: string };
    let payload: Record<string, unknown>;

    try {
      header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf-8"));
      payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    } catch (err: unknown) {
      return { valid: false, error: "Failed to decode base64url JSON header or payload" };
    }

    const alg = header.alg;
    if (!alg) {
      return { valid: false, error: "Missing alg in token header" };
    }

    const signedData = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, "base64url");

    let signatureValid = false;

    if (alg === "HS256") {
      if (!this.hmacSecret) {
        return { valid: false, error: "HS256 token rejected: No HMAC secret configured" };
      }
      const expectedSig = crypto
        .createHmac("sha256", this.hmacSecret)
        .update(signedData)
        .digest();
      signatureValid =
        signature.length === expectedSig.length &&
        crypto.timingSafeEqual(signature, expectedSig);
    } else if (alg === "RS256" || alg === "ES256") {
      if (!this.jwksKeyManager) {
        return { valid: false, error: `${alg} verification requires a configured JwksKeyManager` };
      }
      const keyObj = await this.jwksKeyManager.getKey(header.kid);
      if (!keyObj) {
        return { valid: false, error: `Public key not found for kid: ${header.kid ?? "default"}` };
      }

      try {
        const cryptoKey = crypto.createPublicKey({
          key: keyObj as crypto.JsonWebKey,
          format: "jwk"
        });
        const verifier = crypto.createVerify(alg === "RS256" ? "RSA-SHA256" : "SHA256");
        verifier.update(signedData);
        signatureValid = verifier.verify(cryptoKey, signature);
      } catch (err: unknown) {
        return { valid: false, error: `Cryptographic verification error: ${err instanceof Error ? err.message : String(err)}` };
      }
    } else {
      return { valid: false, error: `Unsupported algorithm: ${alg}` };
    }

    if (!signatureValid) {
      return { valid: false, error: "Invalid signature" };
    }

    // Claims validations
    const nowSec = Math.floor(Date.now() / 1000);
    const clockTolerance = options?.clockToleranceSeconds ?? 60;

    // Check expiration (exp)
    if (typeof payload.exp === "number") {
      if (nowSec - clockTolerance > payload.exp) {
        return { valid: false, error: `Token expired at ${payload.exp}, current time is ${nowSec}` };
      }
    }

    // Check not-before (nbf)
    if (typeof payload.nbf === "number") {
      if (nowSec + clockTolerance < payload.nbf) {
        return { valid: false, error: `Token not valid before ${payload.nbf}` };
      }
    }

    // Check issuer (iss)
    if (options?.expectedIssuer && payload.iss !== options.expectedIssuer) {
      return { valid: false, error: `Issuer mismatch: expected ${options.expectedIssuer}, got ${payload.iss}` };
    }

    // Check audience (aud)
    if (options?.expectedAudience) {
      const aud = payload.aud;
      const audMatches = Array.isArray(aud)
        ? aud.includes(options.expectedAudience)
        : aud === options.expectedAudience;
      if (!audMatches) {
        return { valid: false, error: `Audience mismatch: expected ${options.expectedAudience}, got ${payload.aud}` };
      }
    }

    // Check nonce if requested
    if (options?.expectedNonce && payload.nonce !== options.expectedNonce) {
      return { valid: false, error: `Nonce mismatch: expected ${options.expectedNonce}, got ${payload.nonce}` };
    }

    return { valid: true, payload };
  }

  /**
   * Creates an internal HS256 signed session token using the HMAC secret.
   */
  public signHs256(payload: SsoSessionPayload): string {
    if (!this.hmacSecret) {
      throw new Error("Cannot sign HS256 token without hmacSecret configured");
    }
    const header = { alg: "HS256", typ: "JWT" };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signedData = `${headerB64}.${payloadB64}`;
    const signature = crypto
      .createHmac("sha256", this.hmacSecret)
      .update(signedData)
      .digest("base64url");
    return `${signedData}.${signature}`;
  }
}
