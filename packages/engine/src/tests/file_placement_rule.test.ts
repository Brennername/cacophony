import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { RuleEvaluationContext } from "@cacophony/shared-types";
import { FilePlacementAndNamingConventionRule } from "../rules/catalog/FilePlacementAndNamingConventionRule.js";

describe("FilePlacementAndNamingConventionRule Test Suite (T102.6.2)", () => {
  const createContext = (
    modifiedFiles: readonly string[],
    projectRoot = "/workspace",
  ): RuleEvaluationContext => ({
    projectRoot,
    hook: "post_generation",
    modifiedFiles,
    fileContents: new Map(modifiedFiles.map((f) => [f, "// content"])),
    simulate: true,
  });

  describe("Metadata and Default Properties", () => {
    it("should provide canonical file placement rule metadata", () => {
      const rule = new FilePlacementAndNamingConventionRule();
      assert.strictEqual(rule.id, "file_placement_and_naming");
      assert.strictEqual(rule.defaultSeverity, "hard_rejection");
      assert.deepStrictEqual(rule.applicableHooks, ["post_generation", "pre_test"]);
    });
  });

  describe("Phase-Numbered Filename Detection", () => {
    it("should hard-reject phase-numbered filenames by default", async () => {
      const rule = new FilePlacementAndNamingConventionRule();
      const files = [
        "/workspace/src/phase14_worker.ts",
        "/workspace/src/phase102_feature.test.ts",
      ];

      const result = await rule.evaluate(createContext(files), "hard_rejection");
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.hardRejected, true);
      assert.strictEqual(result.diagnostics.length, 2);
      assert.match(
        result.diagnostics[0]?.message ?? "",
        /Disallowed phase-numbered filename/,
      );
    });

    it("should allow phase-numbered filenames when disallowPhaseNaming option is false", async () => {
      const rule = new FilePlacementAndNamingConventionRule();
      const files = ["/workspace/src/phase14_worker.ts"];

      const result = await rule.evaluate(createContext(files), "hard_rejection", {
        disallowPhaseNaming: false,
      });
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.diagnostics.length, 0);
    });
  });

  describe("Angular Co-located Component Spec Enforcement", () => {
    it("should reject loose component specs placed directly under src/app/components/", async () => {
      const rule = new FilePlacementAndNamingConventionRule();
      const files = [
        "/workspace/src/app/components/task-history.spec.ts",
      ];

      const result = await rule.evaluate(createContext(files), "hard_rejection");
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.hardRejected, true);
      assert.strictEqual(result.diagnostics.length, 1);
      assert.match(
        result.diagnostics[0]?.message ?? "",
        /Misplaced component test file/,
      );
    });

    it("should permit properly co-located Angular component specs in their subdirectories", async () => {
      const rule = new FilePlacementAndNamingConventionRule();
      const files = [
        "/workspace/src/app/components/task-history/task-history.component.spec.ts",
        "/workspace/src/app/components/frontier-modal/frontier-modal.component.spec.ts",
        "/workspace/src/app/services/auth.service.spec.ts",
      ];

      const result = await rule.evaluate(createContext(files), "hard_rejection");
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.hardRejected, false);
      assert.strictEqual(result.diagnostics.length, 0);
    });

    it("should emit soft warnings without failing the rule under soft_warning severity", async () => {
      const rule = new FilePlacementAndNamingConventionRule();
      const files = [
        "/workspace/src/app/components/misplaced.spec.ts",
      ];

      const result = await rule.evaluate(createContext(files), "soft_warning");
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.hardRejected, false);
      assert.strictEqual(result.diagnostics.length, 1);
      assert.strictEqual(result.diagnostics[0]?.severity, "soft_warning");
    });
  });
});
