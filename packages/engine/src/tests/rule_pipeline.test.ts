import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RulePipelineEngine,
  RuleDslParser,
  StripEmojisRule,
  EnforceEsmJsExtensionRule,
  WhitespaceAndEolNormalizerRule,
  LooseRootFileGuardRule,
  EmptyFileGuardRule,
  PlaceholderStubDetectorRule,
  BannedImportScrubberRule,
  FilePlacementAndNamingConventionRule,
} from "../rules/index.js";
import { RuleEvaluationContext, RulePipelineDeclaration } from "@cacophony/shared-types";

describe("Phase 25: Composable Deterministic Repair Rule DSL & Pipeline Engine", () => {
  describe("T25.1: Declarative Rule DSL Grammar & AST Parser", () => {
    it("should parse human-readable DSL syntax with variable interpolation", () => {
      const dslSource = `
        pipeline "custom_pipeline" {
          name "Custom Test Pipeline"
          description "High-integrity testing rules"
          target_arch "\${TARGET_ARCH}"

          hook post_generation {
            rule strip_emojis [severity=silent_repair]
            rule enforce_esm_js [severity=silent_repair]
          }

          hook pre_test {
            rule banned_imports [severity=hard_rejection, continueOnError=true, packages=["conductor", "lodash"]]
            rule loose_root_files [severity=soft_warning]
          }
        }
      `;

      const parser = new RuleDslParser();
      const pipeline = parser.parse(dslSource, { TARGET_ARCH: "x86_64-linux-vega" });

      assert.equal(pipeline.id, "custom_pipeline");
      assert.equal(pipeline.name, "Custom Test Pipeline");
      assert.equal(pipeline.description, "High-integrity testing rules");
      assert.equal(pipeline.targetArch, "x86_64-linux-vega");
      assert.equal(pipeline.hooks.length, 2);

      const postGen = pipeline.hooks.find((h) => h.hook === "post_generation");
      assert.ok(postGen);
      assert.equal(postGen.rules.length, 2);
      assert.equal(postGen.rules[0]!.ruleId, "strip_emojis");
      assert.equal(postGen.rules[0]!.severity, "silent_repair");

      const preTest = pipeline.hooks.find((h) => h.hook === "pre_test");
      assert.ok(preTest);
      assert.equal(preTest.rules.length, 2);
      assert.equal(preTest.rules[0]!.ruleId, "banned_imports");
      assert.equal(preTest.rules[0]!.severity, "hard_rejection");
      assert.equal(preTest.rules[0]!.continueOnError, true);
      assert.deepEqual(preTest.rules[0]!.options?.packages, ["conductor", "lodash"]);
    });
  });

  describe("T25.2: Core Deterministic Repair Rule Catalog", () => {
    it("StripEmojisRule: should strip emojis in silent_repair and preserve musical notes", async () => {
      const rule = new StripEmojisRule();
      const content = `// High performance audio worker 🚀\nconst note = "♩"; // Musical symbol preserved\n`;
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: ["/tmp/cacophony/src/audio.ts"],
        fileContents: new Map([["/tmp/cacophony/src/audio.ts", content]]),
        simulate: true,
      };

      const result = await rule.evaluate(context, "silent_repair");
      assert.ok(result.passed);
      assert.equal(result.mutations.length, 1);
      assert.ok(!result.mutations[0]!.updatedContent.includes("🚀"));
      assert.ok(result.mutations[0]!.updatedContent.includes("♩"));
    });

    it("EnforceEsmJsExtensionRule: should append missing .js extension on relative imports", async () => {
      const rule = new EnforceEsmJsExtensionRule();
      const content = `import { Task } from "./models/Task";\nimport express from "express";\n`;
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: ["/tmp/cacophony/src/index.ts"],
        fileContents: new Map([["/tmp/cacophony/src/index.ts", content]]),
        simulate: true,
      };

      const result = await rule.evaluate(context, "silent_repair");
      assert.ok(result.passed);
      assert.equal(result.mutations.length, 1);
      assert.ok(result.mutations[0]!.updatedContent.includes(`from "./models/Task.js"`));
      assert.ok(result.mutations[0]!.updatedContent.includes(`from "express"`));
    });

    it("WhitespaceAndEolNormalizerRule: should normalize CRLF, trim trailing spaces, and add newline", async () => {
      const rule = new WhitespaceAndEolNormalizerRule();
      const content = "line 1   \r\nline 2\t\r\nline 3";
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: ["/tmp/cacophony/src/file.ts"],
        fileContents: new Map([["/tmp/cacophony/src/file.ts", content]]),
        simulate: true,
      };

      const result = await rule.evaluate(context, "silent_repair");
      assert.ok(result.passed);
      assert.equal(result.mutations.length, 1);
      assert.equal(result.mutations[0]!.updatedContent, "line 1\nline 2\nline 3\n");
    });

    it("LooseRootFileGuardRule: should flag loose root files not in permitted list", async () => {
      const rule = new LooseRootFileGuardRule();
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "pre_test",
        modifiedFiles: ["loose_script.ts", "package.json"],
        fileContents: new Map([
          ["loose_script.ts", "console.log('bad');"],
          ["package.json", "{}"],
        ]),
        simulate: true,
      };

      const result = await rule.evaluate(context, "hard_rejection");
      assert.ok(!result.passed);
      assert.equal(result.hardRejected, true);
      assert.equal(result.diagnostics.length, 1);
      assert.ok(result.diagnostics[0]!.message.includes("loose_script.ts"));
    });

    it("EmptyFileGuardRule: should reject 0-byte or whitespace-only files", async () => {
      const rule = new EmptyFileGuardRule();
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "pre_test",
        modifiedFiles: ["/tmp/cacophony/src/empty.ts"],
        fileContents: new Map([["/tmp/cacophony/src/empty.ts", "   \n\t  "]]),
        simulate: true,
      };

      const result = await rule.evaluate(context, "hard_rejection");
      assert.ok(!result.passed);
      assert.equal(result.hardRejected, true);
    });

    it("PlaceholderStubDetectorRule: should detect lazy TODO and unimplemented stubs", async () => {
      const rule = new PlaceholderStubDetectorRule();
      const content = `export function compute() {\n  // TODO: implement later\n  throw new Error("Not implemented");\n}\n`;
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: ["/tmp/cacophony/src/calc.ts"],
        fileContents: new Map([["/tmp/cacophony/src/calc.ts", content]]),
        simulate: true,
      };

      const result = await rule.evaluate(context, "soft_warning", { maxAllowed: 0 });
      assert.ok(result.passed);
      assert.ok(result.diagnostics.length > 0);
      assert.equal(result.diagnostics[0]!.severity, "soft_warning");
    });

    it("BannedImportScrubberRule: should hard reject banned imports", async () => {
      const rule = new BannedImportScrubberRule();
      const content = `import { conductor } from "conductor";\n`;
      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "pre_test",
        modifiedFiles: ["/tmp/cacophony/src/leak.ts"],
        fileContents: new Map([["/tmp/cacophony/src/leak.ts", content]]),
        simulate: true,
      };

      const result = await rule.evaluate(context, "hard_rejection", { packages: ["conductor"] });
      assert.ok(!result.passed);
      assert.equal(result.hardRejected, true);
    });

    it("FilePlacementAndNamingConventionRule: should hard reject phase-numbered filenames and loose component specs", async () => {
      const rule = new FilePlacementAndNamingConventionRule();

      // Case 1: Phase-numbered file rejection
      const phaseContext: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: ["/tmp/cacophony/packages/frontend/src/app/components/phase15-components.spec.ts"],
        fileContents: new Map([["/tmp/cacophony/packages/frontend/src/app/components/phase15-components.spec.ts", "// test"]]),
        simulate: true,
      };

      const phaseResult = await rule.evaluate(phaseContext, "hard_rejection");
      assert.ok(!phaseResult.passed);
      assert.equal(phaseResult.hardRejected, true);
      assert.ok(phaseResult.diagnostics.length >= 1);
      assert.ok(phaseResult.diagnostics[0]!.message.includes("phase-numbered filename"));

      // Case 2: Misplaced component spec in parent components dir
      const misplacedContext: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: ["/tmp/cacophony/packages/frontend/src/app/components/my-widget.spec.ts"],
        fileContents: new Map([["/tmp/cacophony/packages/frontend/src/app/components/my-widget.spec.ts", "// test"]]),
        simulate: true,
      };

      const misplacedResult = await rule.evaluate(misplacedContext, "hard_rejection");
      assert.ok(!misplacedResult.passed);
      assert.equal(misplacedResult.hardRejected, true);
      assert.ok(misplacedResult.diagnostics.some((d) => d.message.includes("Misplaced component test file")));

      // Case 3: Proper co-located component spec passes
      const validContext: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: [
          "/tmp/cacophony/packages/frontend/src/app/components/session-tabs/session-tabs.component.ts",
          "/tmp/cacophony/packages/frontend/src/app/components/session-tabs/session-tabs.component.spec.ts",
        ],
        fileContents: new Map(),
        simulate: true,
      };

      const validResult = await rule.evaluate(validContext, "hard_rejection");
      assert.ok(validResult.passed);
      assert.equal(validResult.diagnostics.length, 0);
    });
  });

  describe("T25.3: Rule Pipeline Chaining & Execution Engine", () => {
    it("should execute pipeline chaining, short-circuit on hard_rejection, and collect soft warnings", async () => {
      const engine = new RulePipelineEngine();

      const pipeline: RulePipelineDeclaration = {
        id: "test_pipeline",
        name: "Test Pipeline",
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
              { ruleId: "loose_root_files", severity: "soft_warning" },
            ],
          },
        ],
      };

      // 1. Test post_generation chaining repairs
      const content = `const greeting = "Hello 🚀";   \r\n`;
      const postGenContext: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "post_generation",
        modifiedFiles: ["/tmp/cacophony/src/test.ts"],
        fileContents: new Map([["/tmp/cacophony/src/test.ts", content]]),
        simulate: true,
      };

      const postGenOutcome = await engine.executePipelineHook(pipeline, "post_generation", postGenContext);
      assert.ok(postGenOutcome.passed);
      assert.equal(postGenOutcome.repairsApplied.length, 2);
      assert.equal(postGenOutcome.rejections.length, 0);

      // Verify chained memory output
      const repairedContent = postGenOutcome.repairsApplied[1]!.updatedContent;
      assert.equal(repairedContent, `const greeting = "Hello ";\n`);

      // 2. Test pre_test short-circuit on hard_rejection
      const preTestContext: RuleEvaluationContext = {
        projectRoot: "/tmp/cacophony",
        hook: "pre_test",
        modifiedFiles: ["/tmp/cacophony/src/empty.ts"],
        fileContents: new Map([["/tmp/cacophony/src/empty.ts", ""]]),
        simulate: true,
      };

      const preTestOutcome = await engine.executePipelineHook(pipeline, "pre_test", preTestContext);
      assert.equal(preTestOutcome.passed, false);
      assert.equal(preTestOutcome.hardRejected, true);
      assert.equal(preTestOutcome.totalRulesRun, 1); // Short-circuited!
    });
  });
});
