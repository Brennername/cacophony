import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { StubCommentSanitizer } from "../testing/StubCommentSanitizer.js";

describe("StubCommentSanitizer", () => {
  describe("Residual Stub Detection", () => {
    test("should return false when source code has no stub markers", () => {
      const code = `
        export function computeTotal(items: number[]): number {
          return items.reduce((acc, curr) => acc + curr, 0);
        }
      `;
      assert.equal(StubCommentSanitizer.hasResidualStubs(code), false);
      assert.deepEqual(StubCommentSanitizer.findResidualMarkers(code), []);
    });

    test("should detect hash stub markers and cage markers", () => {
      const code = `
        export class Calculator {
          /* [CACOPHONY_HASH_STUB:add:a1b2c3] */
          public add(a: number, b: number): number {
            return a + b;
          }

          // [CACOPHONY_CAGE:sub:d4e5f6] temporary cage
          public sub(a: number, b: number): number {
            return a - b;
          }
        }
      `;
      assert.equal(StubCommentSanitizer.hasResidualStubs(code), true);
      const markers = StubCommentSanitizer.findResidualMarkers(code);
      assert.equal(markers.length, 2);
      assert.ok(markers.includes("[CACOPHONY_HASH_STUB:add:a1b2c3]"));
      assert.ok(markers.includes("[CACOPHONY_CAGE:sub:d4e5f6]"));
    });

    test("should deduplicate multiple occurrences of identical markers", () => {
      const code = `
        // [CACOPHONY_HASH_STUB:test:123]
        // [CACOPHONY_HASH_STUB:test:123]
      `;
      const markers = StubCommentSanitizer.findResidualMarkers(code);
      assert.equal(markers.length, 1);
      assert.equal(markers[0], "[CACOPHONY_HASH_STUB:test:123]");
    });
  });

  describe("Sanitization and Whitespace Cleanup", () => {
    test("should remove block comment stubs cleanly", () => {
      const input = `
        export class AuthGateway {
          /* [CACOPHONY_HASH_STUB:authenticate:hash99] */
          public authenticate(token: string): boolean {
            return token.length > 0;
          }
        }
      `;
      const result = StubCommentSanitizer.sanitize(input);
      assert.equal(result.removedCount, 1);
      assert.equal(result.residualMarkers.length, 0);
      assert.ok(!result.sanitizedCode.includes("CACOPHONY_HASH_STUB"));
      assert.ok(result.sanitizedCode.includes("public authenticate(token: string): boolean {"));
    });

    test("should remove single-line comment stubs and trailing comments", () => {
      const input = `
        // [CACOPHONY_HASH_STUB:init:abcdef] Initializer stub
        export function init(): void {
          // [CACOPHONY_CAGE:setup:112233] Internal setup
          console.log("initialized");
        }
      `;
      const result = StubCommentSanitizer.sanitize(input);
      assert.equal(result.removedCount, 2);
      assert.equal(result.residualMarkers.length, 0);
      assert.ok(!result.sanitizedCode.includes("CACOPHONY_HASH_STUB"));
      assert.ok(!result.sanitizedCode.includes("CACOPHONY_CAGE"));
      assert.ok(result.sanitizedCode.includes("export function init(): void {"));
    });

    test("should collapse consecutive blank lines produced by comment stripping", () => {
      const input = [
        "const a = 1;",
        "",
        "/* [CACOPHONY_HASH_STUB:marker:1] */",
        "",
        "const b = 2;",
      ].join("\n");

      const result = StubCommentSanitizer.sanitize(input);
      assert.equal(result.removedCount, 1);
      // Consecutive empty lines should not exceed one
      const lines = result.sanitizedCode.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i]!.trim() === "") {
          assert.notEqual(lines[i + 1]!.trim(), "");
        }
      }
    });

    test("should preserve clean code when no stubs are present", () => {
      const cleanCode = `
        export interface Config {
          readonly port: number;
          readonly host: string;
        }
      `;
      const result = StubCommentSanitizer.sanitize(cleanCode);
      assert.equal(result.removedCount, 0);
      assert.equal(result.residualMarkers.length, 0);
      assert.equal(result.sanitizedCode, cleanCode);
    });
  });
});
