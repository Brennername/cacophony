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
});
