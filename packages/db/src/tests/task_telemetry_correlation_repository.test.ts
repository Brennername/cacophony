import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import {
  TaskTelemetryCorrelationRepository,
  type TaskTelemetryCorrelationRecord,
} from "../repositories/TaskTelemetryCorrelationRepository.js";

describe("TaskTelemetryCorrelationRepository", () => {
  let driver: PGliteDriver;
  let repo: TaskTelemetryCorrelationRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new TaskTelemetryCorrelationRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should record correlation record and retrieve by model ID", async () => {
    const record: TaskTelemetryCorrelationRecord = {
      id: "corr_001",
      taskId: "task_1",
      modelId: "qwen2.5-coder:14b",
      avgGpuBusy: 75.5,
      peakEdgeTemp: 68.2,
      totalTokens: 1200,
      avgTokensPerSec: 28.4,
      thermalThrottleEvents: 0,
      durationMs: 42250,
      createdAt: new Date().toISOString(),
    };

    await repo.recordCorrelation(record);

    const correlations = await repo.getCorrelationsForModel("qwen2.5-coder:14b");
    assert.equal(correlations.length, 1);
    assert.equal(correlations[0]!.id, "corr_001");
    assert.equal(correlations[0]!.taskId, "task_1");
    assert.equal(correlations[0]!.avgGpuBusy, 75.5);
    assert.equal(correlations[0]!.peakEdgeTemp, 68.2);
    assert.equal(correlations[0]!.totalTokens, 1200);
    assert.equal(correlations[0]!.avgTokensPerSec, 28.4);
    assert.equal(correlations[0]!.thermalThrottleEvents, 0);
  });

  test("should aggregate model efficiency summary across recorded runs", async () => {
    await repo.recordCorrelation({
      id: "corr_1",
      taskId: "task_10",
      modelId: "deepseek-r1:8b",
      avgGpuBusy: 60.0,
      peakEdgeTemp: 62.0,
      totalTokens: 800,
      avgTokensPerSec: 35.0,
      thermalThrottleEvents: 0,
      durationMs: 22800,
      createdAt: new Date().toISOString(),
    });

    await repo.recordCorrelation({
      id: "corr_2",
      taskId: "task_11",
      modelId: "deepseek-r1:8b",
      avgGpuBusy: 85.0,
      peakEdgeTemp: 74.0,
      totalTokens: 1400,
      avgTokensPerSec: 25.0,
      thermalThrottleEvents: 2,
      durationMs: 56000,
      createdAt: new Date().toISOString(),
    });

    const summaries = await repo.getModelEfficiencySummary();
    assert.equal(summaries.length, 1);
    const summary = summaries[0]!;
    assert.equal(summary.modelId, "deepseek-r1:8b");
    assert.equal(summary.totalRuns, 2);
    assert.equal(summary.avgTokensPerSec, 30.0);
    assert.equal(summary.avgPeakTemp, 68.0);
    assert.equal(summary.throttleEventCount, 2);
  });
});
