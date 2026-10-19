import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  HumanResonantPrGenerator,
  type HumanResonantPrOptions,
} from "../gitea/HumanResonantPrGenerator.js";

describe("T103.1: HumanResonantPrGenerator Unit Tests", () => {
  const generator = new HumanResonantPrGenerator();

  it("should generate conventional title based on role and focus file scope", () => {
    const title = generator.generatePrTitle({
      taskId: "task-001",
      taskTitle: "Implement GitPlatformProvider issue methods",
      role: "implementer",
      focusFiles: "packages/engine/src/gitea/GitPlatformProvider.ts",
    });

    assert.strictEqual(
      title,
      "feat(engine): Implement GitPlatformProvider issue methods",
    );

    const testTitle = generator.generatePrTitle({
      taskId: "task-002",
      taskTitle: "Write unit tests for ModelVramCatalog",
      role: "test_engineer",
      focusFiles: "packages/engine/src/tests/vram_catalog.test.ts",
    });

    assert.strictEqual(
      testTitle,
      "test(engine): Write unit tests for ModelVramCatalog",
    );
  });

  it("should generate technical narrative without dry generic checklists", () => {
    const options: HumanResonantPrOptions = {
      taskId: "task-003",
      taskTitle: "T103.1: Human Resonant PR Generator",
      prompt: "Implement human-like pull request descriptions",
      focusFiles: "packages/engine/src/gitea/HumanResonantPrGenerator.ts",
      implementerModel: "qwen2.5-coder:7b-instruct-q4_K_M",
      reviewerModel: "deepseek-r1:8b",
      reviewVerdict: "APPROVE",
      reviewNotes: "Clean SOLID design with typed contracts.",
      reviewComments: [
        {
          path: "packages/engine/src/gitea/HumanResonantPrGenerator.ts",
          lineNumber: 42,
          comment: "Ensure string slicing handles short inputs gracefully",
          severity: "info",
        },
      ],
      solidScore: 95,
      testCommand: "node --test packages/engine/dist/tests/human_resonant_pr_generator.test.js",
      testExitCode: 0,
      testDurationMs: 142,
      remediationRounds: [
        {
          round: 1,
          modelUsed: "qwen2.5-coder:7b-instruct-q4_K_M",
          critiqueAddressed: "Added boundary check on string slicing",
          changesMade: "Guarded diff.slice and testOutput.slice against null/undefined",
        },
      ],
      potentialRegressions: [
        {
          module: "AutomatedPrWorkflow",
          reason: "PR body formatting caller updated",
          status: "mitigated",
        },
      ],
      diff: "export interface PrOptions {\n  readonly taskId: string;\n}\nclass PrGenerator implements IPrGenerator {\n  // logic\n}",
    };

    const body = generator.generatePrBody(options);

    // Verify absence of dry automated checklists
    assert.strictEqual(body.includes("- [x] Code generation completed"), false);
    assert.strictEqual(body.includes("- [x] AST scrubbing"), false);

    // Verify presence of rich technical narrative
    assert.ok(body.includes("## Summary of Changes"));
    assert.ok(body.includes("task-003"));
    assert.ok(body.includes("qwen2.5-coder:7b-instruct-q4_K_M"));
    assert.ok(body.includes("deepseek-r1:8b"));
    assert.ok(body.includes("Clean SOLID design with typed contracts."));
    assert.ok(body.includes("Ensure string slicing handles short inputs gracefully"));
    assert.ok(body.includes("Remediation Trail & Compliance Fixes"));
    assert.ok(body.includes("Added boundary check on string slicing"));
    assert.ok(body.includes("*SOLID Architectural Adherence Score*: **95/100**"));
    assert.ok(body.includes("Blast Radius & Downstream Regression Watchlist"));
    assert.ok(body.includes("PASSED (Exit code: 0)"));
  });

  it("should handle minimal options gracefully without errors", () => {
    const options: HumanResonantPrOptions = {
      taskId: "task-minimal",
      taskTitle: "Minimal task title",
    };

    const body = generator.generatePrBody(options);
    assert.ok(body.includes("## Summary of Changes"));
    assert.ok(body.includes("Minimal task title"));
    assert.ok(body.includes("Verification & Testing Evidence"));
    assert.strictEqual(body.includes("Peer Review"), false);
  });
});
