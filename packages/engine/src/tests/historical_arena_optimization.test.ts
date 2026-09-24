import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import {
  HistoricalArenaIngestionAdapter,
  RuleBacktestRunner,
  StochasticHyperparameterOptimizer,
} from "../optimization/index.js";
import { RulePipelineEngine } from "../rules/RulePipelineEngine.js";
import { HistoricalTaskRecord, RulePipelineDeclaration } from "@cacophony/shared-types";

describe("Phase 26: Decoupled Historical Arena Ingestion & Stochastic Hyperparameter Optimization", () => {
  const arenaBasePath = path.join(os.homedir(), "projects/drumalyzer/data/arena");

  describe("T26.1: Historical Arena Telemetry Ingestion & Mitigation Paradox", () => {
    it("should parse drumalyzer stats.json and produce Mitigation Paradox Report", async () => {
      const adapter = new HistoricalArenaIngestionAdapter(arenaBasePath);
      const stats = await adapter.loadStats();

      assert.equal(stats.totalProcessed, 3584);
      assert.equal(stats.totalCompleted, 624);
      assert.equal(stats.totalFailed, 2960);
      assert.equal(stats.failureReasons["review_failed"], 1049);
      assert.equal(stats.failureReasons["test_failed"], 167);

      const paradox = adapter.analyzeMitigationParadox(stats);

      // Demonstrates: Real test failures are only ~4.6%, but rigid verification rejection accounted for ~35%+ of failures!
      assert.equal(paradox.realTestFailureCount, 167);
      assert.ok(paradox.realTestFailurePct < 5.0, "Real test failures should be < 5%");
      assert.ok(paradox.verifierRejectionCount > 1200, "Verifier rejections should be > 1200");
      assert.ok(paradox.counterfactualPassRatePct > paradox.rawPassRatePct, "Counterfactual pass rate should exceed raw baseline");
    });

    it("should load task records from historical arena completed and failed folders", async () => {
      const adapter = new HistoricalArenaIngestionAdapter(arenaBasePath);
      const tasks = await adapter.loadTasks("completed", 5);

      assert.ok(tasks.length > 0);
      assert.equal(tasks[0]!.status, "completed");
      assert.ok(tasks[0]!.model);
    });

    it("should load postmortems from historical arena", async () => {
      const adapter = new HistoricalArenaIngestionAdapter(arenaBasePath);
      const postmortems = await adapter.loadPostmortems(5);

      assert.ok(postmortems.length > 0);
      assert.ok(postmortems[0]!.failureStatus);
    });
  });

  describe("T26.2: Offline Rule Pipeline Backtesting Engine", () => {
    it("should simulate rule execution across historical tasks and evaluate pass rates", async () => {
      const engine = new RulePipelineEngine();
      const runner = new RuleBacktestRunner(engine);

      const pipeline: RulePipelineDeclaration = {
        id: "permissive_repair_pipeline",
        name: "Permissive Silent Repair Pipeline",
        hooks: [
          {
            hook: "post_generation",
            rules: [
              { ruleId: "strip_emojis", severity: "silent_repair" },
              { ruleId: "whitespace_normalizer", severity: "silent_repair" },
              { ruleId: "enforce_esm_js", severity: "silent_repair" },
            ],
          },
        ],
      };

      const tasks: HistoricalTaskRecord[] = [
        {
          id: "task-001",
          model: "openai/qwen2.5-coder:7b-4k",
          status: "completed",
          focusFiles: "src/index.ts",
          patchContent: `// Content with emoji 🚀 and CRLF\r\nimport { foo } from "./foo";\r\n`,
        },
        {
          id: "task-002",
          model: "openai/deepseek-r1:8b-4k",
          status: "failed",
          focusFiles: "src/app.ts",
          patchContent: `const x = 1; \r\n`,
        },
      ];

      const sim = await runner.runBacktest(pipeline, tasks);
      assert.equal(sim.totalReplayed, 2);
      assert.equal(sim.passedCount, 2);
      assert.ok(sim.repairsTriggeredCount > 0);
      assert.equal(sim.passRatePct, 100);
    });
  });

  describe("T26.3: Stochastic Hyperparameter Optimization Engine", () => {
    it("should execute genetic evolution across rule configurations and improve pipeline fitness", async () => {
      const engine = new RulePipelineEngine();
      const optimizer = new StochasticHyperparameterOptimizer(engine);

      const tasks: HistoricalTaskRecord[] = [
        {
          id: "hist-001",
          model: "openai/qwen2.5-coder:7b-4k",
          status: "completed",
          focusFiles: "src/foo.ts",
          patchContent: `import { bar } from "./bar";\n`,
        },
        {
          id: "hist-002",
          model: "openai/qwen2.5-coder:7b-4k",
          status: "failed",
          focusFiles: "src/bad.ts",
          patchContent: `// TODO: implement later\nimport { conductor } from "conductor";\n`,
        },
      ];

      const optResult = await optimizer.optimize("openai/qwen2.5-coder:7b-4k", tasks, {
        strategy: "genetic_evolution",
        generations: 3,
        populationSize: 4,
      });

      assert.equal(optResult.targetModel, "openai/qwen2.5-coder:7b-4k");
      assert.equal(optResult.strategy, "genetic_evolution");
      assert.equal(optResult.generationsEvaluated, 3);
      assert.ok(optResult.candidatesTested >= 4);
      assert.ok(optResult.bestGenome);
    });
  });
});
