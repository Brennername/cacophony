import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord } from "@cacophony/shared-types";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";

describe("Regression Burst Mitigation & Epoch Reset (T100.3)", () => {
  const createMockTask = (id: string, failureCount = 0): TaskRecord => ({
    id,
    title: `Task ${id}`,
    prompt: `Execute task ${id}`,
    role: "implementer",
    status: "PENDING",
    priority: "P1",
    modelAssigned: "qwen2.5-coder:7b",
    testCommand: "npm test",
    focusFiles: "src/main.ts",
    targetBranch: "master",
    prUrl: null,
    failureCount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  });

  const createMockEvictionManager = () =>
    ({
      selectModel: async () => "qwen2.5-coder:7b",
      getEjectedModels: () => new Set<string>(),
      recordRunOutcome: async () => {},
    }) as any;

  const createMockTelemetry = () =>
    ({
      sample: async () => ({
        edgeTempCelsius: 45,
        junctionTempCelsius: 50,
        vramUsedBytes: 1024,
        vramTotalBytes: 4096,
        gpuBusyPercent: 10,
        pptWatts: 15,
        sclkMhz: 1000,
        mclkMhz: 1000,
        timestamp: new Date().toISOString(),
      }),
      getCurrentSnapshot: async () => ({
        timestamp: Date.now(),
        edgeTempC: 45,
        junctionTempC: 50,
        apuPowerWatts: 15,
        memoryUsedBytes: 1024,
        memoryTotalBytes: 4096,
        inferenceTokensPerSec: 25,
      }),
    }) as any;

  it("resets consecutive failure counter on task success", async () => {
    let pendingTasks: TaskRecord[] = [createMockTask("task-success-1")];

    const taskRepo = {
      listPending: async () => pendingTasks,
      updateStatus: async () => {},
      updateModel: async () => {},
      incrementFailure: async () => 1,
      reclaimStaleRunningTasks: async () => 0,
    } as any;

    const stageRepo = {
      recordStageStart: async () => 1,
      recordStageCompletion: async () => {},
    } as any;

    const scheduler = new TaskScheduler({
      taskRepo,
      stageRepo,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: createMockTelemetry(),
      autoReplenish: false,
    });

    scheduler.setExecutionHandler(async () => {
      return { success: true, tokensPerSec: 30 };
    });

    await scheduler.tick(true);
    assert.strictEqual(scheduler.getConsecutiveBurstFailures(), 0);
  });

  it("detects regression burst and triggers queue regrooming, epoch advance, and callback", async () => {
    const executedTasks: TaskRecord[] = [
      createMockTask("task-burst-1"),
      createMockTask("task-burst-2"),
      createMockTask("task-burst-3"),
    ];
    let currentIndex = 0;

    let reclaimedCalled = false;
    const taskRepo = {
      listPending: async () => {
        if (currentIndex < executedTasks.length) {
          return [executedTasks[currentIndex]!];
        }
        return [];
      },
      updateStatus: async () => {},
      updateModel: async () => {},
      incrementFailure: async () => 1,
      reclaimStaleRunningTasks: async () => {
        reclaimedCalled = true;
        return 2;
      },
    } as any;

    const stageRepo = {
      recordStageStart: async () => 1,
      recordStageCompletion: async () => {},
    } as any;

    const advancedEpochs: Array<{ name: string; reason: string; notes?: string | undefined }> = [];
    const mockHealthRepo = {
      advanceEpoch: async (name: string, reason: string, notes?: string) => {
        advancedEpochs.push({ name, reason, notes });
        return { epochId: 2, name, reason };
      },
    };

    let callbackBurstCount = 0;
    let callbackLastTaskId = "";
    let callbackReason = "";
    const onRegressionBurst = async (
      consecutiveFailures: number,
      lastTask: TaskRecord,
      reason: string,
    ) => {
      callbackBurstCount = consecutiveFailures;
      callbackLastTaskId = lastTask.id;
      callbackReason = reason;
    };

    const scheduler = new TaskScheduler({
      taskRepo,
      stageRepo,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: createMockTelemetry(),
      autoReplenish: false,
      regressionBurstThreshold: 3,
      modelHealthRepository: mockHealthRepo,
      onRegressionBurst,
    });

    scheduler.setExecutionHandler(async () => {
      return {
        success: false,
        tokensPerSec: 15,
        failureReason: "Deterministic AST validation failed",
      };
    });

    // Execute task 1 -> consecutive failures = 1
    await scheduler.tick(true);
    assert.strictEqual(scheduler.getConsecutiveBurstFailures(), 1);
    assert.strictEqual(advancedEpochs.length, 0);

    // Execute task 2 -> consecutive failures = 2
    currentIndex = 1;
    await scheduler.tick(true);
    assert.strictEqual(scheduler.getConsecutiveBurstFailures(), 2);
    assert.strictEqual(advancedEpochs.length, 0);

    // Execute task 3 -> consecutive failures reaches 3 -> mitigation triggers
    currentIndex = 2;
    await scheduler.tick(true);

    // Verification:
    // 1. Queue was regroomed (reclaim was called)
    assert.strictEqual(reclaimedCalled, true);

    // 2. Telemetry epoch was advanced
    assert.strictEqual(advancedEpochs.length, 1);
    assert.ok(advancedEpochs[0]?.reason.includes("Regression burst mitigation"));
    assert.ok(advancedEpochs[0]?.reason.includes("task-burst-3"));

    // 3. Callback fired with correct metadata
    assert.strictEqual(callbackBurstCount, 3);
    assert.strictEqual(callbackLastTaskId, "task-burst-3");
    assert.ok(callbackReason.includes("Deterministic AST validation failed"));

    // 4. Consecutive failure counter was reset after mitigation
    assert.strictEqual(scheduler.getConsecutiveBurstFailures(), 0);
  });
});
