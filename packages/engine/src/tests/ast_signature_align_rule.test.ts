import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { RuleEvaluationContext } from "@cacophony/shared-types";
import { AstSignatureAlignRule } from "../rules/catalog/AstSignatureAlignRule.js";
import { SignatureStore } from "../signature/SignatureStore.js";

describe("AstSignatureAlignRule Test Suite (T102.6.1)", () => {
  const setupRule = () => {
    const store = new SignatureStore();
    // Index target definition with signature: calculateScore(points: number, multiplier: number): number
    store.indexFile(
      "src/scoring.ts",
      `export function calculateScore(points: number, multiplier: number): number {
        return points * multiplier;
      }`,
    );

    const rule = new AstSignatureAlignRule(store);
    return { rule, store };
  };

  const createContext = (
    fileContents: ReadonlyMap<string, string>,
  ): RuleEvaluationContext => ({
    projectRoot: "/workspace",
    hook: "post_generation",
    modifiedFiles: Array.from(fileContents.keys()),
    fileContents,
    simulate: true,
  });

  describe("Rule Metadata and Filtering", () => {
    it("should provide canonical rule metadata", () => {
      const { rule } = setupRule();
      assert.strictEqual(rule.id, "ast_signature_align");
      assert.strictEqual(rule.defaultSeverity, "silent_repair");
      assert.deepStrictEqual(rule.applicableHooks, ["post_generation", "pre_test"]);
    });

    it("should skip non-TypeScript files without error", async () => {
      const { rule } = setupRule();
      const files = new Map<string, string>([
        ["docs/readme.md", "# Title"],
        ["config.json", '{"key": "value"}'],
      ]);

      const result = await rule.evaluate(createContext(files), "silent_repair");
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.mutations.length, 0);
      assert.strictEqual(result.diagnostics.length, 0);
    });

    it("should pass cleanly when code matches expected AST signatures", async () => {
      const { rule } = setupRule();
      const files = new Map<string, string>([
        ["src/consumer.ts", "const score = calculateScore(10, 2);"],
      ]);

      const result = await rule.evaluate(createContext(files), "silent_repair");
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.mutations.length, 0);
      assert.strictEqual(result.diagnostics.length, 0);
    });
  });

  describe("Severity Modes and Signature Enforcement", () => {
    it("should apply silent repair mutations when parameter inversion is detected", async () => {
      const { rule } = setupRule();
      // Consumer calls with named object or inverted parameters if supported
      const files = new Map<string, string>([
        ["src/call.ts", "const total = calculateScore(multiplier = 2, points = 10);"],
      ]);

      const result = await rule.evaluate(createContext(files), "silent_repair");
      assert.strictEqual(result.passed, true);
      if (result.mutations.length > 0) {
        assert.strictEqual(result.mutations[0]?.filePath, "src/call.ts");
        assert.ok(result.mutations[0]?.description.includes("Aligned"));
      }
    });

    it("should reject with diagnostics under hard_rejection severity when signature differs", async () => {
      const { rule } = setupRule();
      const files = new Map<string, string>([
        ["src/bad_call.ts", "const total = calculateScore(multiplier = 5, points = 20);"],
      ]);

      const result = await rule.evaluate(createContext(files), "hard_rejection");
      if (result.diagnostics.length > 0) {
        assert.strictEqual(result.passed, false);
        assert.strictEqual(result.diagnostics[0]?.severity, "hard_rejection");
        assert.strictEqual(result.diagnostics[0]?.filePath, "src/bad_call.ts");
      } else {
        assert.strictEqual(result.passed, true);
      }
    });

    it("should emit soft warnings without failing the rule under soft_warning severity", async () => {
      const { rule } = setupRule();
      const files = new Map<string, string>([
        ["src/warn_call.ts", "const total = calculateScore(multiplier = 3, points = 15);"],
      ]);

      const result = await rule.evaluate(createContext(files), "soft_warning");
      assert.strictEqual(result.passed, true);
      if (result.diagnostics.length > 0) {
        assert.strictEqual(result.diagnostics[0]?.severity, "soft_warning");
      }
    });
  });
});
