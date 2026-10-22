import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import type { IHardwareTelemetryProvider } from "../telemetry/IHardwareTelemetryProvider.js";

describe("TaskScheduler Model Pre-Execution Unload (T68.4.2)", () => {
  const createMockEvictionManager = () =>
    ({
      selectModel: async (_role: string, candidates: string[]) => candidates[0] ?? "qwen2.5-coder:7b",
      getEjectedModels: () => new Set<string>(),
      recordRunOutcome: async () => {},
    }) as any;

  const createHeadroomTelemetry = (freeVramMb: number): IHardwareTelemetryProvider => ({
    getName: () => "MockTelemetryProvider",
    isAvailable: async () => true,
    sample: async () => ({
      edgeTempCelsius: 45,
      junctionTempCelsius: 50,
      vramUsedBytes: (8192 - freeVramMb) * 1024 * 1024,
      vramTotalBytes: 8192 * 1024 * 1024,
      vramPercent: Number((((8192 - freeVramMb) / 8192) * 1024).toFixed(1)),
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
    checkVramHeadroom: (requiredMb: number) => {
      const safetyMarginMb = 512;
      return freeVramMb >= requiredMb + safetyMarginMb;
    },
    getVramMetrics: async () => ({
      totalBytes: 8192 * 1024 * 1024,
      usedBytes: Math.max(0, 8192 - freeVramMb) * 1024 * 1024,
      freeBytes: freeVramMb * 1024 * 1024,
    }),
  });

  it("triggers explicit unload when switching to disparate architecture with constrained headroom", async () => {
    let unloadedModel: string | null = null;
    let evictionPolled = false;

    const mockOllama = {
      unloadModel: async (model: string) => {
        unloadedModel = model;
      },
      waitForModelEviction: async (_model: string) => {
        evictionPolled = true;
        return true;
      },
    };

    // Free VRAM: 2000 MB (not enough for qwen2.5-coder:7b + deepseek-r1:8b)
    const telemetry = createHeadroomTelemetry(2000);
    const scheduler = new TaskScheduler({
      taskRepo: { listPending: async () => [] } as any,
      stageRepo: {} as any,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: telemetry,
      ollamaProvider: mockOllama,
    });

    const result = await scheduler.prepareModelExecution("qwen2.5-coder:7b", "deepseek-r1:8b");
    assert.equal(result, true, "Explicit model unload should have returned true");
    assert.equal(unloadedModel, "deepseek-r1:8b", "Active model should have been unloaded");
    assert.equal(evictionPolled, true, "waitForModelEviction should have been polled");
  });

  it("does not trigger unload when switching within same model architecture family", async () => {
    let unloadedModel: string | null = null;

    const mockOllama = {
      unloadModel: async (model: string) => {
        unloadedModel = model;
      },
    };

    const telemetry = createHeadroomTelemetry(2000);
    const scheduler = new TaskScheduler({
      taskRepo: { listPending: async () => [] } as any,
      stageRepo: {} as any,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: telemetry,
      ollamaProvider: mockOllama,
    });

    // Both are qwen family
    const result = await scheduler.prepareModelExecution("qwen2.5-coder:3b", "qwen2.5-coder:7b");
    assert.equal(result, false, "Same architecture family should not trigger explicit unload");
    assert.equal(unloadedModel, null, "No model should have been unloaded");
  });

  it("does not trigger unload when active model is already target model or None", async () => {
    let unloadedModel: string | null = null;

    const mockOllama = {
      unloadModel: async (model: string) => {
        unloadedModel = model;
      },
    };

    const telemetry = createHeadroomTelemetry(2000);
    const scheduler = new TaskScheduler({
      taskRepo: { listPending: async () => [] } as any,
      stageRepo: {} as any,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: telemetry,
      ollamaProvider: mockOllama,
    });

    const resultSame = await scheduler.prepareModelExecution("qwen2.5-coder:7b", "qwen2.5-coder:7b");
    assert.equal(resultSame, false);

    const resultNone = await scheduler.prepareModelExecution("qwen2.5-coder:7b", "None");
    assert.equal(resultNone, false);

    assert.equal(unloadedModel, null);
  });

  it("proactively evicts active model during scheduler.tick when candidate task fits standalone but is blocked by resident model", async () => {
    let unloadedModel: string | null = null;
    let freeVramMb = 3000; // initially only 3000 MB free (with qwen2.5-coder:7b resident)

    const mockOllama = {
      unloadModel: async (model: string) => {
        unloadedModel = model;
        // Unloading frees up VRAM
        freeVramMb = 12000;
      },
      waitForModelEviction: async (_model: string) => true,
      listLoadedModels: async () => (unloadedModel ? [] : ["qwen2.5-coder:7b"]),
    };

    const telemetry: IHardwareTelemetryProvider = {
      getName: () => "MockAmdVegaTelemetryProvider",
      isAvailable: async () => true,
      sample: async () => ({
        edgeTempCelsius: 45,
        junctionTempCelsius: 50,
        vramUsedBytes: (16384 - freeVramMb) * 1024 * 1024,
        vramTotalBytes: 16384 * 1024 * 1024,
        vramPercent: 50,
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
      checkVramHeadroom: (requiredMb: number) => {
        const safetyMarginMb = 1024;
        return freeVramMb >= requiredMb + safetyMarginMb;
      },
      getVramMetrics: async () => ({
        totalBytes: 16384 * 1024 * 1024,
        usedBytes: Math.max(0, 16384 - freeVramMb) * 1024 * 1024,
        freeBytes: freeVramMb * 1024 * 1024,
      }),
    };

    const task8b = {
      id: "task-deepseek-8b",
      title: "Task Deepseek 8b",
      prompt: "Execute task",
      role: "architect",
      status: "PENDING" as const,
      priority: "P1" as const,
      modelAssigned: "deepseek-r1:8b",
      testCommand: "npm test",
      focusFiles: "src/main.ts",
      targetBranch: "master",
      prUrl: null,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    let executedTaskId: string | null = null;
    const scheduler = new TaskScheduler({
      taskRepo: {
        listPending: async () => [task8b],
        updateStatus: async () => {},
        updateModel: async () => {},
      } as any,
      stageRepo: {
        recordStageStart: async () => 1,
        recordStageCompletion: async () => {},
      } as any,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: telemetry,
      ollamaProvider: mockOllama,
      probe: {
        getLoadedModel: async () => (unloadedModel ? null : "qwen2.5-coder:7b"),
      } as any,
    });

    scheduler.setExecutionHandler(async (groomed) => {
      executedTaskId = groomed.task.id;
      return { success: true, tokensPerSec: 25 };
    });

    const dispatched = await scheduler.tick(true);
    assert.ok(dispatched, "Scheduler should dispatch the task after proactive eviction");
    assert.equal(dispatched.id, "task-deepseek-8b");
    assert.equal(unloadedModel, "qwen2.5-coder:7b", "Resident model should have been unloaded to free headroom");
    assert.equal(executedTaskId, "task-deepseek-8b");
  });
});
