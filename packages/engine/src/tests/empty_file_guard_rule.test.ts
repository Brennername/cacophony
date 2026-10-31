import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { RuleEvaluationContext } from "@cacophony/shared-types";
import { EmptyFileGuardRule } from "../rules/catalog/EmptyFileGuardRule.js";

describe("EmptyFileGuardRule Test Suite (T102.6.4)", () => {
  const createContext = (
    fileContents: ReadonlyMap<string, string>,
  ): RuleEvaluationContext => ({
    projectRoot: "/workspace",
    hook: "post_generation",
    modifiedFiles: Array.from(fileContents.keys()),
    fileContents,
    simulate: true,
  });

  describe("Metadata and Initial State", () => {
    it("should provide canonical empty file guard metadata", () => {
      const rule = new EmptyFileGuardRule();
      assert.strictEqual(rule.id, "empty_files");
      assert.strictEqual(rule.defaultSeverity, "hard_rejection");
      assert.deepStrictEqual(rule.applicableHooks, ["post_generation", "pre_test"]);
    });
  });

  describe("Empty and Whitespace-Only File Detection", () => {
    it("should hard-reject 0-byte completely empty files", async () => {
      const rule = new EmptyFileGuardRule();
      const files = new Map<string, string>([
        ["src/empty.ts", ""],
      ]);

      const result = await rule.evaluate(createContext(files), "hard_rejection");
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.hardRejected, true);
      assert.strictEqual(result.diagnostics.length, 1);
      assert.strictEqual(
        result.diagnostics[0]?.message,
        "Empty or whitespace-only file detected: src/empty.ts",
      );
      assert.strictEqual(result.diagnostics[0]?.severity, "hard_rejection");
    });

    it("should hard-reject whitespace-only files with newlines and tabs", async () => {
      const rule = new EmptyFileGuardRule();
      const files = new Map<string, string>([
        ["src/whitespace.ts", "   \n\t  \r\n   "],
      ]);

      const result = await rule.evaluate(createContext(files), "hard_rejection");
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.hardRejected, true);
      assert.strictEqual(result.diagnostics.length, 1);
      assert.strictEqual(
        result.diagnostics[0]?.message,
        "Empty or whitespace-only file detected: src/whitespace.ts",
      );
    });

    it("should emit soft warnings without failing the rule under soft_warning severity", async () => {
      const rule = new EmptyFileGuardRule();
      const files = new Map<string, string>([
        ["src/stub.ts", "  \n  "],
      ]);

      const result = await rule.evaluate(createContext(files), "soft_warning");
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.hardRejected, false);
      assert.strictEqual(result.diagnostics.length, 1);
      assert.strictEqual(
        result.diagnostics[0]?.message,
        "Warning: Empty file detected: src/stub.ts",
      );
    });

    it("should pass cleanly when files contain meaningful content", async () => {
      const rule = new EmptyFileGuardRule();
      const files = new Map<string, string>([
        ["src/valid.ts", "export const PI = 3.14159;"],
        ["src/index.ts", "console.log('Operational');"],
      ]);

      const result = await rule.evaluate(createContext(files), "hard_rejection");
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.hardRejected, false);
      assert.strictEqual(result.diagnostics.length, 0);
      assert.strictEqual(result.mutations.length, 0);
    });
  });
});
