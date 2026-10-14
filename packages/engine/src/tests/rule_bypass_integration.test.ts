import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RulePipelineEngine } from "../rules/RulePipelineEngine.js";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import type {
  RuleEvaluationContext,
  RulePipelineDeclaration,
  TaskRecord,
} from "@cacophony/shared-types";

describe("Phase 72: T72.2 Dynamic Rule Scrubber Bypasses & Hyperparameter Pipeline Injection", () => {
  describe("T72.2.1: Dynamic Rule Scrubber Bypasses via RulePipelineEngine", () => {
    const pipeline: RulePipelineDeclaration = {
      id: "bypass_test_pipeline",
      name: "Bypass Test Pipeline",
      hooks: [
        {
          hook: "post_generation",
          rules: [
            { ruleId: "strip_emojis", severity: "silent_repair" },
            { ruleId: "whitespace_normalizer", severity: "silent_repair" },
          ],
        },
        {
          hook: "pre_test",
          rules: [
            { ruleId: "empty_files", severity: "hard_rejection" },
          ],
        },
      ],
    };

    it("should strip emojis when no bypass rule is provided", async () => {
      const engine = new RulePipelineEngine();
      // Using Unicode rocket character \u{1F680} to verify stripping behavior
      const rawContent = 'const status = "Launch \u{1F680}";   \r\n';
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: ["/tmp/cacophony/src/status.ts"],
        fileContents: new Map([["/tmp/cacophony/src/status.ts", rawContent]]),
        simulate: true,
      };

      const outcome = await engine.executePipeline(pipeline, "post_generation", context);
      assert.ok(outcome.passed);
      assert.strictEqual(outcome.repairsApplied.length, 2);

      const finalContent = outcome.repairsApplied[1]!.updatedContent;
      // Emoji removed and whitespace normalized
      assert.strictEqual(finalContent, 'const status = "Launch ";\n');
    });

    it("should preserve emojis when bypassRules contains 'emoji_scrubber' alias", async () => {
      const engine = new RulePipelineEngine();
      const rawContent = 'const status = "Launch \u{1F680}";   \r\n';
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: ["/tmp/cacophony/src/status.ts"],
        fileContents: new Map([["/tmp/cacophony/src/status.ts", rawContent]]),
        simulate: true,
        bypassRules: ["emoji_scrubber"],
      };

      const outcome = await engine.executePipeline(pipeline, "post_generation", context);
      assert.ok(outcome.passed);
      // Only whitespace_normalizer should execute since emoji_scrubber was bypassed
      assert.strictEqual(outcome.repairsApplied.length, 1);

      const finalContent = outcome.repairsApplied[0]!.updatedContent;
      assert.strictEqual(finalContent, 'const status = "Launch \u{1F680}";\n');
    });

    it("should preserve emojis when bypassRules contains direct rule ID 'strip_emojis'", async () => {
      const engine = new RulePipelineEngine();
      const rawContent = 'const badge = "Sparkle \u{2728}";   \r\n';
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: ["/tmp/cacophony/src/badge.ts"],
        fileContents: new Map([["/tmp/cacophony/src/badge.ts", rawContent]]),
        simulate: true,
        bypassRules: ["strip_emojis"],
      };

      const outcome = await engine.executePipelineHook(pipeline, "post_generation", context);
      assert.ok(outcome.passed);
      assert.strictEqual(outcome.repairsApplied.length, 1);

      const finalContent = outcome.repairsApplied[0]!.updatedContent;
      assert.strictEqual(finalContent, 'const badge = "Sparkle \u{2728}";\n');
    });

    it("should bypass empty_files rule when bypassRules specifies 'empty_file_guard'", async () => {
      const engine = new RulePipelineEngine();
      const emptyContent = "";
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "pre_test",
        modifiedFiles: ["/tmp/cacophony/src/stub.ts"],
        fileContents: new Map([["/tmp/cacophony/src/stub.ts", emptyContent]]),
        simulate: true,
        bypassRules: ["empty_file_guard"],
      };

      const outcome = await engine.executePipeline(pipeline, "pre_test", context);
      // Rule was bypassed, so pre_test passes without rejection
      assert.ok(outcome.passed);
      assert.strictEqual(outcome.hardRejected, false);
      assert.strictEqual(outcome.totalRulesRun, 0);
    });
  });

  describe("T72.2.3: Explicit Model Pinning via TaskMetadataHints", () => {
    it("should pin target model when metadataHints.modelAffinity is specified", async () => {
      const scheduler = new TaskScheduler({
        taskRepo: {} as any,
        stageRepo: {} as any,
        evictionManager: {} as any,
        telemetryProvider: {} as any,
      });


      const taskWithAffinity: TaskRecord = {
        id: "task-pin-1",
        title: "Model Pinning Task",
        prompt: "Execute strictly on pinned model",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: "qwen2.5-coder:3b",
        testCommand: null,
        focusFiles: null,
        targetBranch: null,
        prUrl: null,
        failureCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        metadataHints: {
          modelAffinity: "qwen2.5-coder:14b",
        },
      };

      // Even though failureCount > 0 and assigned model is 3b, modelAffinity should guarantee 14b
      const resolved = await scheduler.selectCandidateModel(taskWithAffinity, "qwen2.5-coder:7b");
      assert.strictEqual(resolved, "qwen2.5-coder:14b");
    });
  });
});
