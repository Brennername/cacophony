import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import {
  HistoricalArenaIngestionAdapter,
  RuleBacktestRunner,
  StochasticHyperparameterOptimizer,
  DatasetVersionMigrator,
} from "../optimization/index.js";
import { RulePipelineEngine } from "../rules/RulePipelineEngine.js";
import {
  HistoricalTaskRecord,
  RulePipelineDeclaration,
} from "@cacophony/shared-types";

describe("Phase 26: Decoupled Historical Arena Ingestion & Stochastic Hyperparameter Optimization", () => {
  const arenaBasePath =
    process.env["ARENA_DATASET_DIR"] ||
    path.resolve(process.cwd(), "data/arena");

  const hasLiveDataset = fs.existsSync(path.join(arenaBasePath, "stats.json"));

  describe("T26.1: Historical Arena Telemetry Ingestion & Mitigation Paradox", () => {
    it("should parse arena dataset stats.json and produce Mitigation Paradox Report", async (t) => {
      if (!hasLiveDataset) {
        t.skip(
          "Skipping live arena dataset assertions: stats.json not found at " +
            arenaBasePath,
        );
        return;
      }
      const adapter = new HistoricalArenaIngestionAdapter(arenaBasePath);
      const stats = await adapter.loadStats();
      const version = await adapter.getDatasetVersion();

      assert.ok(version, "Dataset version should be detected");
      assert.equal(stats.totalProcessed, 3584);
      assert.equal(stats.totalCompleted, 624);
      assert.equal(stats.totalFailed, 2960);
      assert.equal(stats.failureReasons["review_failed"], 1049);
      assert.equal(stats.failureReasons["test_failed"], 167);

      const paradox = adapter.analyzeMitigationParadox(stats);

      // Demonstrates: Real test failures are only ~4.6%, but rigid verification rejection accounted for ~35%+ of failures!
      assert.equal(paradox.realTestFailureCount, 167);
      assert.ok(
        paradox.realTestFailurePct < 5.0,
        "Real test failures should be < 5%",
      );
      assert.ok(
        paradox.verifierRejectionCount > 1200,
        "Verifier rejections should be > 1200",
      );
      assert.ok(
        paradox.counterfactualPassRatePct > paradox.rawPassRatePct,
        "Counterfactual pass rate should exceed raw baseline",
      );
    });

    it("should load task records from historical arena completed and failed folders", async (t) => {
      if (!hasLiveDataset) {
        t.skip(
          "Skipping live arena dataset assertions: stats.json not found at " +
            arenaBasePath,
        );
        return;
      }
      const adapter = new HistoricalArenaIngestionAdapter(arenaBasePath);
      const tasks = await adapter.loadTasks("completed", 5);

      assert.ok(tasks.length > 0);
      assert.equal(tasks[0]!.status, "completed");
      assert.ok(tasks[0]!.model);
    });

    it("should load postmortems from historical arena", async (t) => {
      if (!hasLiveDataset) {
        t.skip(
          "Skipping live arena dataset assertions: stats.json not found at " +
            arenaBasePath,
        );
        return;
      }
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

      const optResult = await optimizer.optimize(
        "openai/qwen2.5-coder:7b-4k",
        tasks,
        {
          strategy: "genetic_evolution",
          generations: 3,
          populationSize: 4,
        },
      );

      assert.equal(optResult.targetModel, "openai/qwen2.5-coder:7b-4k");
      assert.equal(optResult.strategy, "genetic_evolution");
      assert.equal(optResult.generationsEvaluated, 3);
      assert.ok(optResult.candidatesTested >= 4);
      assert.ok(optResult.bestGenome);
    });
  });

  describe("T71.1: Dataset Schema Versioning & Data Directory Compatibility Migration", () => {
    it("should migrate legacy v1.0.0 arena data directory to v2.0.0 with manifest.json", async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arena-v1-legacy-"));
      try {
        const completedDir = path.join(tempDir, "completed");
        fs.mkdirSync(completedDir, { recursive: true });

        // Write legacy task with snake_case fields
        const legacyTask = {
          task_id: "legacy-task-1",
          task_type: "scaffold",
          model: "qwen2.5-coder:7b",
          target_branch: "task/legacy-1",
          source_task_id: "origin-1",
          test_command: "node --check index.js",
          focus_files: "index.js",
          finished_at: "2026-01-01T00:00:00Z",
        };
        fs.writeFileSync(
          path.join(completedDir, "legacy-task-1.json"),
          JSON.stringify(legacyTask),
          "utf-8",
        );

        // Write legacy stats.json without format_version
        const legacyStats = {
          total_completed: 1,
          total_failed: 0,
          total_processed: 1,
          failure_reasons: {},
          last_updated: "2026-01-01T00:00:00Z",
        };
        fs.writeFileSync(
          path.join(tempDir, "stats.json"),
          JSON.stringify(legacyStats),
          "utf-8",
        );

        const migrator = new DatasetVersionMigrator();
        const result = await migrator.migrate(tempDir, { inplace: true });

        assert.equal(result.manifest.version, "2.0.0");
        assert.equal(result.manifest.schemaRevision, 2);
        assert.equal(result.manifest.totalTasks, 1);
        assert.equal(result.tasksMigrated, 1);

        // Verify manifest.json exists
        const manifestRaw = fs.readFileSync(path.join(tempDir, "manifest.json"), "utf-8");
        const manifest = JSON.parse(manifestRaw);
        assert.equal(manifest.version, "2.0.0");

        // Verify stats.json was updated with format_version
        const statsRaw = fs.readFileSync(path.join(tempDir, "stats.json"), "utf-8");
        const stats = JSON.parse(statsRaw);
        assert.equal(stats.format_version, "2.0.0");

        // Verify standardized task JSON
        const updatedTaskRaw = fs.readFileSync(path.join(completedDir, "legacy-task-1.json"), "utf-8");
        const updatedTask = JSON.parse(updatedTaskRaw);
        assert.equal(updatedTask.id, "legacy-task-1");
        assert.equal(updatedTask.taskType, "scaffold");
        assert.equal(updatedTask.targetBranch, "task/legacy-1");
        assert.equal(updatedTask.testCommand, "node --check index.js");
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("should assert compatible version and reject unsupported future versions", async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arena-version-check-"));
      try {
        const adapter = new HistoricalArenaIngestionAdapter(tempDir);

        // No manifest, fallback should be compatible (defaults to 2.0.0)
        const vDefault = await adapter.assertCompatibleVersion(tempDir);
        assert.ok(vDefault);

        // v1.0.0 should be compatible
        fs.writeFileSync(
          path.join(tempDir, "manifest.json"),
          JSON.stringify({ version: "1.0.0", schemaRevision: 1, totalTasks: 0, createdAt: new Date().toISOString() }),
          "utf-8",
        );
        const vLegacy = await adapter.assertCompatibleVersion(tempDir);
        assert.equal(vLegacy, "1.0.0");

        // v2.0.0 should be compatible
        fs.writeFileSync(
          path.join(tempDir, "manifest.json"),
          JSON.stringify({ version: "2.0.0", schemaRevision: 2, totalTasks: 0, createdAt: new Date().toISOString() }),
          "utf-8",
        );
        const vCurrent = await adapter.assertCompatibleVersion(tempDir);
        assert.equal(vCurrent, "2.0.0");

        // v3.0.0 should be rejected as unsupported future version
        fs.writeFileSync(
          path.join(tempDir, "manifest.json"),
          JSON.stringify({ version: "3.0.0", schemaRevision: 3, totalTasks: 0, createdAt: new Date().toISOString() }),
          "utf-8",
        );
        await assert.rejects(
          async () => adapter.assertCompatibleVersion(tempDir),
          /Unsupported arena dataset schema version '3.0.0'/,
        );
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});

