import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { TaskRepository } from "../repositories/TaskRepository.js";
import { StageRepository } from "../repositories/StageRepository.js";
import {
  LogReductionService,
  STAGE_SIZE_RATIOS,
} from "../services/LogReductionService.js";
import { DatabaseMaintenanceService } from "../services/DatabaseMaintenanceService.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("LogReductionService & Statistical Histograms", () => {
  let driver: PGliteDriver;
  let taskRepo: TaskRepository;
  let stageRepo: StageRepository;
  let reductionService: LogReductionService;

  before(async () => {
    driver = new PGliteDriver();
    await driver.connect();

    const runner = new MigrationRunner(driver);
    await runner.migrate();

    taskRepo = new TaskRepository(driver);
    stageRepo = new StageRepository(driver);
    reductionService = new LogReductionService({
      driver,
      maxStorageThresholdBytes: 100 * 1024 * 1024,
      minTaskAgeDays: 0, // 0 days in unit test so created tasks are immediately eligible
      preserveRecentTasksCount: 0,
      preserveLightweightStages: true,
      batchSize: 5,
    });
  });

  after(async () => {
    await driver.close();
  });

  test("T104.1: should document empirical stage log size ratios", () => {
    assert.equal(STAGE_SIZE_RATIOS["test_execution"], 50);
    assert.equal(STAGE_SIZE_RATIOS["generation"], 20);
    assert.equal(STAGE_SIZE_RATIOS["remediation"], 8);
    assert.equal(STAGE_SIZE_RATIOS["deterministic_scrub"], 1);
    assert.equal(STAGE_SIZE_RATIOS["planning"], 0.5);
  });

  test("T104.2: should reduce bulky test and generation logs to statistical histograms while preserving lightweight stages", async () => {
    const taskId = "task-reduction-test-1";
    const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const task: TaskRecord = {
      id: taskId,
      title: "Historical task with repeated failed remediation runs",
      prompt: "Fix complex algorithmic concurrency bug",
      role: "implementer",
      status: "COMPLETED",
      priority: "P1",
      modelAssigned: "qwen2.5-coder:7b",
      testCommand: "npm test",
      focusFiles: "src/worker.ts",
      targetBranch: "arena/task-reduction-test-1",
      prUrl: null,
      failureCount: 2,
      createdAt: oldDate,
      updatedAt: oldDate,
      completedAt: oldDate,
    };

    await taskRepo.create(task);

    // Stage 1: Planning (Lightweight: 80 bytes)
    const s1 = await stageRepo.recordStageStart(taskId, "planning");
    await stageRepo.recordStageCompletion(
      s1,
      "SUCCESS",
      "Focus files identified: src/worker.ts, src/types.ts",
      100,
      200,
      1200,
    );

    // Stage 2: Generation Attempt 1 (Bulky code dump: 2,500 bytes)
    const bulkyCode = `// Generated Code Attempt 1\n` + "export function solve() { return 42; }\n".repeat(60);
    const s2 = await stageRepo.recordStageStart(taskId, "generation");
    await stageRepo.recordStageCompletion(
      s2,
      "FAILURE",
      bulkyCode,
      500,
      1500,
      4500,
    );

    // Stage 3: Deterministic AST Scrub (Lightweight: 120 bytes)
    const s3 = await stageRepo.recordStageStart(taskId, "deterministic_scrub");
    await stageRepo.recordStageCompletion(
      s3,
      "SUCCESS",
      "Applied 2 AST import fixes and added semicolon.",
      0,
      0,
      15,
    );

    // Stage 4: Test Execution (Bulky vitest trace: 4,000 bytes)
    const bulkyTestTrace = `FAIL packages/worker/test.ts\nAssertionError: expected true to be false\n` +
      `    at Object.test (test.ts:42:15)\n    at node:internal/process:120\n`.repeat(70);
    const s4 = await stageRepo.recordStageStart(taskId, "test_execution");
    await stageRepo.recordStageCompletion(
      s4,
      "FAILURE",
      bulkyTestTrace,
      0,
      0,
      6100,
    );

    // Execute reduction
    const summary = await reductionService.reduceTaskById(
      taskId,
      "Historical task retirement test",
    );

    assert.ok(summary !== null);
    assert.equal(summary.taskId, taskId);
    assert.equal(summary.stagesReduced, 2); // s2 (generation) and s4 (test_execution)
    assert.ok(summary.reclaimedBytes > 5000);
    assert.ok(summary.reclaimedPct > 70);

    // Verify stages in database
    const updatedStages = await stageRepo.getStagesForTask(taskId);
    assert.equal(updatedStages.length, 4);

    const stage0 = updatedStages[0];
    const stage1 = updatedStages[1];
    const stage2 = updatedStages[2];
    const stage3 = updatedStages[3];
    assert.ok(stage0 && stage1 && stage2 && stage3);

    // Planning must remain intact
    assert.equal(
      stage0.logOutput,
      "Focus files identified: src/worker.ts, src/types.ts",
    );

    // AST scrub must remain intact
    assert.equal(
      stage2.logOutput,
      "Applied 2 AST import fixes and added semicolon.",
    );

    // Generation attempt 1 must have reduced notice with exact user phrase
    const reducedGenLog = stage1.logOutput ?? "";
    assert.ok(
      reducedGenLog.startsWith(
        "The log of this has been reduced, this is it's histogram:",
      ),
      "Must begin with exact reduced phrase",
    );
    assert.ok(reducedGenLog.includes("Stage: generation"));
    assert.ok(reducedGenLog.includes("Status: FAILURE"));
    assert.ok(reducedGenLog.includes("Tokens: 500 sent, 1500 received"));
    assert.ok(reducedGenLog.includes("Duration: 4500ms"));

    // Test execution must have reduced notice with exact user phrase
    const reducedTestLog = stage3.logOutput ?? "";
    assert.ok(
      reducedTestLog.startsWith(
        "The log of this has been reduced, this is it's histogram:",
      ),
      "Must begin with exact reduced phrase",
    );
    assert.ok(reducedTestLog.includes("Stage: test_execution"));
    assert.ok(reducedTestLog.includes("Duration: 6100ms (6.10s, Bucket: 5-15s)"));

    // Verify reduction log record was stored in reduction_logs table
    const logs = await reductionService.getReductionLogs(10);
    assert.ok(logs.length >= 1);
    const reductionLog = logs.find((l) => l.taskId === taskId);
    assert.ok(reductionLog !== undefined);
    assert.equal(reductionLog.stagesReduced, 2);
    assert.equal(reductionLog.reductionReason, "Historical task retirement test");
    assert.ok(reductionLog.histogramData.includes("reclaimedPct"));
  });

  test("T104.3: should integrate reduction into DatabaseMaintenanceService", async () => {
    const maintenance = new DatabaseMaintenanceService({
      driver,
      logReductionService: reductionService,
    });

    assert.equal(maintenance.getLogReductionService(), reductionService);

    const result = await maintenance.reduceOldTaskLogs({ limit: 5 });
    assert.ok(typeof result.tasksEvaluated === "number");
    assert.ok(typeof result.stagesReduced === "number");
  });
});
