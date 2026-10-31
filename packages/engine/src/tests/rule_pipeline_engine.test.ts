import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  IRepairRule,
  RuleEvaluationContext,
  RulePipelineDeclaration,
  RuleExecutionResult,
} from "@cacophony/shared-types";
import { RulePipelineEngine } from "../rules/RulePipelineEngine.js";

describe("RulePipelineEngine Test Suite", () => {
  const createMockRule = (
    id: string,
    executeFn: (context: RuleEvaluationContext) => Promise<RuleExecutionResult>,
  ): IRepairRule => ({
    id,
    name: `Rule ${id}`,
    description: `Mock rule for ${id}`,
    defaultSeverity: "silent_repair",
    applicableHooks: ["pre_generation", "post_generation", "pre_test", "post_test"],
    evaluate: (ctx) => executeFn(ctx),
  });

  const createBaseContext = (
    hook: "pre_generation" | "post_generation" | "pre_test" | "post_test",
    fileContents: ReadonlyMap<string, string>,
    bypassRules?: readonly string[],
  ): RuleEvaluationContext => ({
    projectRoot: "/test",
    hook,
    modifiedFiles: Array.from(fileContents.keys()),
    fileContents,
    simulate: true,
    bypassRules,
  });

  describe("Rule Registration and Lookup", () => {
    it("should register default rules on construction", () => {
      const engine = new RulePipelineEngine();
      assert.ok(engine.getRule("strip_emojis"));
      assert.ok(engine.getRule("whitespace_normalizer"));
      assert.ok(engine.getRule("empty_files"));
      assert.ok(engine.getRule("banned_imports"));
    });

    it("should resolve rule aliases correctly", () => {
      const engine = new RulePipelineEngine();
      const direct = engine.getRule("strip_emojis");
      const alias = engine.getRule("emoji_scrubber");
      assert.ok(direct);
      assert.strictEqual(direct, alias);

      const emptyAlias = engine.getRule("empty_file_guard");
      assert.ok(emptyAlias);
      assert.strictEqual(emptyAlias.id, "empty_files");
    });

    it("should allow registering custom rules", () => {
      const engine = new RulePipelineEngine();
      const custom = createMockRule("custom_validator", async () => ({
        ruleId: "custom_validator",
        passed: true,
        hardRejected: false,
        diagnostics: [],
        mutations: [],
        durationMs: 1,
      }));

      engine.registerRule(custom);
      assert.strictEqual(engine.getRule("custom_validator"), custom);
    });
  });

  describe("Sequential Execution and Change Set Accumulation", () => {
    it("should execute rules sequentially and pass accumulated file mutations forward", async () => {
      const engine = new RulePipelineEngine();
      const executionOrder: string[] = [];

      const ruleA = createMockRule("rule_step_a", async (ctx) => {
        executionOrder.push("A");
        const current = ctx.fileContents.get("/test/file.ts") ?? "";
        return {
          ruleId: "rule_step_a",
          passed: true,
          hardRejected: false,
          diagnostics: [],
          mutations: [
            {
              filePath: "/test/file.ts",
              originalContent: current,
              updatedContent: `${current} // processed_by_A`,
              description: "Appended step A marker",
            },
          ],
          durationMs: 2,
        };
      });

      const ruleB = createMockRule("rule_step_b", async (ctx) => {
        executionOrder.push("B");
        const current = ctx.fileContents.get("/test/file.ts") ?? "";
        // Assert that Rule B sees the mutations from Rule A
        assert.ok(current.includes("// processed_by_A"));
        return {
          ruleId: "rule_step_b",
          passed: true,
          hardRejected: false,
          diagnostics: [],
          mutations: [
            {
              filePath: "/test/file.ts",
              originalContent: current,
              updatedContent: `${current} // processed_by_B`,
              description: "Appended step B marker",
            },
          ],
          durationMs: 3,
        };
      });

      engine.registerRule(ruleA);
      engine.registerRule(ruleB);

      const pipeline: RulePipelineDeclaration = {
        id: "sequential_pipeline",
        name: "Sequential Test Pipeline",
        hooks: [
          {
            hook: "post_generation",
            rules: [
              { ruleId: "rule_step_a", severity: "silent_repair" },
              { ruleId: "rule_step_b", severity: "silent_repair" },
            ],
          },
        ],
      };

      const fileMap = new Map<string, string>([
        ["/test/file.ts", "const initial = 42;"],
      ]);

      const context = createBaseContext("post_generation", fileMap);
      const outcome = await engine.executePipeline(pipeline, "post_generation", context);

      assert.strictEqual(outcome.passed, true);
      assert.strictEqual(outcome.totalRulesRun, 2);
      assert.deepStrictEqual(executionOrder, ["A", "B"]);
      assert.strictEqual(outcome.repairsApplied.length, 2);
    });
  });

  describe("Short-Circuit on Fatal Violations", () => {
    it("should short-circuit execution when hardRejected occurs and continueOnError is false", async () => {
      const engine = new RulePipelineEngine();
      let ruleTwoRan = false;

      const ruleFail = createMockRule("fatal_rule", async () => ({
        ruleId: "fatal_rule",
        passed: false,
        hardRejected: true,
        diagnostics: [
          {
            ruleId: "fatal_rule",
            severity: "hard_rejection",
            filePath: "/test/broken.ts",
            message: "Fatal syntax error",
          },
        ],
        mutations: [],
        durationMs: 1,
      }));

      const ruleTwo = createMockRule("downstream_rule", async () => {
        ruleTwoRan = true;
        return {
          ruleId: "downstream_rule",
          passed: true,
          hardRejected: false,
          diagnostics: [],
          mutations: [],
          durationMs: 1,
        };
      });

      engine.registerRule(ruleFail);
      engine.registerRule(ruleTwo);

      const pipeline: RulePipelineDeclaration = {
        id: "abort_pipeline",
        name: "Abort Pipeline",
        hooks: [
          {
            hook: "pre_test",
            rules: [
              { ruleId: "fatal_rule", severity: "hard_rejection", continueOnError: false },
              { ruleId: "downstream_rule", severity: "silent_repair" },
            ],
          },
        ],
      };

      const context = createBaseContext("pre_test", new Map());
      const outcome = await engine.executePipeline(pipeline, "pre_test", context);

      assert.strictEqual(outcome.passed, false);
      assert.strictEqual(outcome.hardRejected, true);
      assert.strictEqual(outcome.totalRulesRun, 1);
      assert.strictEqual(ruleTwoRan, false);
      assert.strictEqual(outcome.rejections.length, 1);
    });

    it("should continue execution after failure when continueOnError is true", async () => {
      const engine = new RulePipelineEngine();
      let ruleTwoRan = false;

      const ruleFail = createMockRule("failing_rule", async () => ({
        ruleId: "failing_rule",
        passed: false,
        hardRejected: true,
        diagnostics: [
          {
            ruleId: "failing_rule",
            severity: "hard_rejection",
            filePath: "/test/file.ts",
            message: "Recoverable warning failure",
          },
        ],
        mutations: [],
        durationMs: 1,
      }));

      const ruleTwo = createMockRule("continued_rule", async () => {
        ruleTwoRan = true;
        return {
          ruleId: "continued_rule",
          passed: true,
          hardRejected: false,
          diagnostics: [],
          mutations: [],
          durationMs: 1,
        };
      });

      engine.registerRule(ruleFail);
      engine.registerRule(ruleTwo);

      const pipeline: RulePipelineDeclaration = {
        id: "continue_pipeline",
        name: "Continue Pipeline",
        hooks: [
          {
            hook: "pre_test",
            rules: [
              { ruleId: "failing_rule", severity: "hard_rejection", continueOnError: true },
              { ruleId: "continued_rule", severity: "silent_repair" },
            ],
          },
        ],
      };

      const context = createBaseContext("pre_test", new Map());
      const outcome = await engine.executePipeline(pipeline, "pre_test", context);

      assert.strictEqual(outcome.passed, false);
      assert.strictEqual(outcome.hardRejected, true);
      assert.strictEqual(outcome.totalRulesRun, 2);
      assert.strictEqual(ruleTwoRan, true);
    });
  });

  describe("Disabled Rules and Dynamic Bypasses", () => {
    it("should skip rules with enabled=false or severity=disabled", async () => {
      const engine = new RulePipelineEngine();
      let disabledRuleRan = false;

      const disabledRule = createMockRule("disabled_rule", async () => {
        disabledRuleRan = true;
        return {
          ruleId: "disabled_rule",
          passed: true,
          hardRejected: false,
          diagnostics: [],
          mutations: [],
          durationMs: 1,
        };
      });

      engine.registerRule(disabledRule);

      const pipeline: RulePipelineDeclaration = {
        id: "skip_pipeline",
        name: "Skip Pipeline",
        hooks: [
          {
            hook: "post_generation",
            rules: [
              { ruleId: "disabled_rule", severity: "disabled" },
            ],
          },
        ],
      };

      const context = createBaseContext("post_generation", new Map());
      const outcome = await engine.executePipeline(pipeline, "post_generation", context);

      assert.strictEqual(outcome.totalRulesRun, 0);
      assert.strictEqual(disabledRuleRan, false);
    });

    it("should bypass rules specified in bypassRules context", async () => {
      const engine = new RulePipelineEngine();
      let bypassedRan = false;

      const rule = createMockRule("strip_emojis", async () => {
        bypassedRan = true;
        return {
          ruleId: "strip_emojis",
          passed: true,
          hardRejected: false,
          diagnostics: [],
          mutations: [],
          durationMs: 1,
        };
      });

      engine.registerRule(rule);

      const pipeline: RulePipelineDeclaration = {
        id: "bypass_pipeline",
        name: "Bypass Pipeline",
        hooks: [
          {
            hook: "post_generation",
            rules: [{ ruleId: "strip_emojis", severity: "hard_rejection" }],
          },
        ],
      };

      const context = createBaseContext("post_generation", new Map(), ["strip_emojis"]);
      const outcome = await engine.executePipeline(pipeline, "post_generation", context);

      assert.strictEqual(outcome.totalRulesRun, 0);
      assert.strictEqual(bypassedRan, false);
    });

    it("should throw an error when an unregistered rule is referenced", async () => {
      const engine = new RulePipelineEngine();

      const pipeline: RulePipelineDeclaration = {
        id: "bad_pipeline",
        name: "Bad Pipeline",
        hooks: [
          {
            hook: "pre_test",
            rules: [{ ruleId: "completely_unknown_rule", severity: "hard_rejection" }],
          },
        ],
      };

      const context = createBaseContext("pre_test", new Map());
      await assert.rejects(
        async () => {
          await engine.executePipeline(pipeline, "pre_test", context);
        },
        /Rule 'completely_unknown_rule' declared in pipeline 'bad_pipeline' is not registered/,
      );
    });
  });
});
