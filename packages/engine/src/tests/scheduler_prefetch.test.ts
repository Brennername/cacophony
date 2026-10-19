import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord } from "@cacophony/shared-types";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import { VramPrefetchCoordinator } from "../inference/VramPrefetchCoordinator.js";

describe("TaskScheduler predictNextModel Test Suite (T87.1.2)", () => {
  const createMockTelemetry = () => ({
    getName: () => "MockTelemetryProvider",
    isAvailable: async () => true,
    sample: async () => ({
      edgeTempCelsius: 45,
      junctionTempCelsius: 50,
      vramUsedBytes: 2048 * 1024 * 1024,
      vramTotalBytes: 8192 * 1024 * 1024,
      vramPercent: 25,
      gttUsedBytes: 0,
      gttTotalBytes: 0,
      gpuBusyPercent: 10,
      pptWatts: 15,
      sclkMhz: 1000,
      mclkMhz: 1000,
      socMilliVolts: 800,
      vddgfxMilliVolts: 800,
      vddnbMilliVolts: 800,
    }),
    checkVramHeadroom: () => true,
    getVramMetrics: async () => ({
      totalBytes: 8192 * 1024 * 1024,
      usedBytes: 2048 * 1024 * 1024,
      freeBytes: 6144 * 1024 * 1024,
    }),
  });

  const createMockEvictionManager = () => ({
    selectModel: async (role: string, candidates: readonly string[]) => {
      if (role === "reviewer") {
        return "deepseek-r1:8b";
      }
      return candidates[0] ?? "qwen2.5-coder:7b-instruct-q4_K_M";
    },
    recordFailure: async () => {},
    recordSuccess: async () => {},
  });

  const createMockTask = (
    id: string,
    role = "implementer",
    priority = "P1",
    status = "PENDING",
  ): TaskRecord => ({
    id,
    title: `Task ${id}`,
    prompt: `Execute task ${id}`,
    role: role as any,
    status: status as any,
    priority: priority as any,
    modelAssigned: "qwen2.5-coder:7b",
    testCommand: "npm test",
    focusFiles: "packages/engine/src/file.ts",
    targetBranch: "master",
    prUrl: null,
    failureCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  });

  it("predicts reviewer model when active task is an implementer nearing completion", async () => {
    const scheduler = new TaskScheduler({
      taskRepo: { listPending: async () => [] } as any,
      stageRepo: {} as any,
      evictionManager: createMockEvictionManager() as any,
      telemetryProvider: createMockTelemetry() as any,
      probe: { getLoadedModel: async () => "qwen2.5-coder:7b" } as any,
    });

    const activeTask = createMockTask("task-running", "implementer", "P1", "RUNNING");

    const predicted = await scheduler.predictNextModel(activeTask);
    assert.equal(predicted, "deepseek-r1:8b");
  });

  it("predicts next pending task model when active task is already a reviewer", async () => {
    const pendingTask = createMockTask("task-queued", "implementer", "P0", "PENDING");
    const scheduler = new TaskScheduler({
      taskRepo: { listPending: async () => [pendingTask] } as any,
      stageRepo: {} as any,
      evictionManager: createMockEvictionManager() as any,
      telemetryProvider: createMockTelemetry() as any,
      probe: { getLoadedModel: async () => "deepseek-r1:8b" } as any,
    });

    const activeTask = createMockTask("task-review", "reviewer", "P1", "RUNNING");

    const predicted = await scheduler.predictNextModel(activeTask);
    assert.ok(
      predicted === "qwen2.5-coder:7b" ||
      predicted === "qwen2.5-coder:7b-instruct-q4_K_M",
    );
  });


  it("returns null when no tasks are queued and no active task exists", async () => {
    const scheduler = new TaskScheduler({
      taskRepo: { listPending: async () => [] } as any,
      stageRepo: {} as any,
      evictionManager: createMockEvictionManager() as any,
      telemetryProvider: createMockTelemetry() as any,
      probe: { getLoadedModel: async () => null } as any,
    });


    const predicted = await scheduler.predictNextModel();
    assert.equal(predicted, null);
  });

  it("manages VramPrefetchCoordinator instance lifecycle", () => {
    const scheduler = new TaskScheduler({
      taskRepo: { listPending: async () => [] } as any,
      stageRepo: {} as any,
      evictionManager: createMockEvictionManager() as any,
      telemetryProvider: createMockTelemetry() as any,
    });

    assert.equal(scheduler.getVramPrefetchCoordinator(), undefined);

    const coordinator = new VramPrefetchCoordinator({
      ollamaProvider: {} as any,
      modelPredictor: scheduler,
    });

    scheduler.setVramPrefetchCoordinator(coordinator);
    assert.equal(scheduler.getVramPrefetchCoordinator(), coordinator);
  });
});
