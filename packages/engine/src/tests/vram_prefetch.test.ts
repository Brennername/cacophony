import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord } from "@cacophony/shared-types";
import {
  VramPrefetchCoordinator,
  type IModelPredictor,
  type IHardwareVramChecker,
} from "../inference/VramPrefetchCoordinator.js";

describe("VramPrefetchCoordinator Test Suite (T87.1.1)", () => {
  const createMockTask = (role: string = "implementer"): TaskRecord => ({
    id: "task-101",
    title: "Implement VRAM speculative loading",
    prompt: "Prompt content",
    role: role as any,
    status: "RUNNING",
    priority: "P1",
    modelAssigned: "qwen2.5-coder:7b",
    testCommand: "npm test",
    focusFiles: "packages/engine/src/inference/VramPrefetchCoordinator.ts",
    targetBranch: "master",
    prUrl: null,
    failureCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  });


  it("skips prefetching during planning stage", async () => {
    let predictCalls = 0;
    const mockPredictor: IModelPredictor = {
      predictNextModel: async () => {
        predictCalls++;
        return "deepseek-r1:8b";
      },
    };
    const mockProvider: any = {
      isModelResident: async () => false,
      preloadModel: async () => {},
    };

    const coordinator = new VramPrefetchCoordinator({
      ollamaProvider: mockProvider,
      modelPredictor: mockPredictor,
    });

    const result = await coordinator.prefetchForTask(createMockTask(), "planning");
    assert.equal(result, null);
    assert.equal(predictCalls, 0);
  });

  it("triggers prefetch during test_execution when candidate is not resident", async () => {
    let preloadedModel: string | null = null;
    let keepAlivePassed: string | number | null = null;

    const mockPredictor: IModelPredictor = {
      predictNextModel: async () => "deepseek-r1:8b",
    };
    const mockProvider: any = {
      isModelResident: async (_model: string) => false,
      preloadModel: async (model: string, keepAlive?: string | number) => {
        preloadedModel = model;
        keepAlivePassed = keepAlive ?? null;
      },
    };

    const coordinator = new VramPrefetchCoordinator({
      ollamaProvider: mockProvider,
      modelPredictor: mockPredictor,
    });

    const candidate = await coordinator.prefetchForTask(
      createMockTask(),
      "test_execution",
    );

    assert.equal(candidate, "deepseek-r1:8b");
    assert.equal(preloadedModel, "deepseek-r1:8b");
    assert.equal(keepAlivePassed, "10m");

    const telemetry = coordinator.getTelemetry();
    assert.equal(telemetry.prefetchesInitiated, 1);
    assert.equal(telemetry.lastPrefetchedModel, "deepseek-r1:8b");
  });

  it("avoids redundant prefetch if model is already resident in VRAM", async () => {
    let preloadCalls = 0;
    const mockPredictor: IModelPredictor = {
      predictNextModel: async () => "qwen2.5-coder:7b",
    };
    const mockProvider: any = {
      isModelResident: async (model: string) => model === "qwen2.5-coder:7b",
      preloadModel: async () => {
        preloadCalls++;
      },
    };

    const coordinator = new VramPrefetchCoordinator({
      ollamaProvider: mockProvider,
      modelPredictor: mockPredictor,
    });

    const candidate = await coordinator.prefetchForTask(
      createMockTask(),
      "test_execution",
    );

    assert.equal(candidate, "qwen2.5-coder:7b");
    assert.equal(preloadCalls, 0);
  });

  it("skips prefetch when VRAM headroom is below threshold", async () => {
    let preloadCalls = 0;
    const mockPredictor: IModelPredictor = {
      predictNextModel: async () => "deepseek-r1:8b",
    };
    const mockProvider: any = {
      isModelResident: async () => false,
      preloadModel: async () => {
        preloadCalls++;
      },
    };
    const mockVramChecker: IHardwareVramChecker = {
      getAvailableVramBytes: async () => 2 * 1024 * 1024 * 1024,
    };

    const coordinator = new VramPrefetchCoordinator({
      ollamaProvider: mockProvider,
      modelPredictor: mockPredictor,
      vramChecker: mockVramChecker,
      minVramHeadroomBytes: 4 * 1024 * 1024 * 1024,
    });

    const candidate = await coordinator.prefetchForTask(
      createMockTask(),
      "test_execution",
    );

    assert.equal(candidate, null);
    assert.equal(preloadCalls, 0);
  });

  it("tracks hit/miss telemetry accurately when models are scheduled", async () => {
    const mockPredictor: IModelPredictor = {
      predictNextModel: async () => "deepseek-r1:8b",
    };
    const mockProvider: any = {
      isModelResident: async () => false,
      preloadModel: async () => {},
    };

    const coordinator = new VramPrefetchCoordinator({
      ollamaProvider: mockProvider,
      modelPredictor: mockPredictor,
    });

    await coordinator.prefetchForTask(createMockTask(), "test_execution");

    coordinator.recordScheduledModel("deepseek-r1:8b");
    let telemetry = coordinator.getTelemetry();
    assert.equal(telemetry.hits, 1);
    assert.equal(telemetry.misses, 0);
    assert.equal(telemetry.hitRatio, 1.0);

    coordinator.recordScheduledModel("qwen2.5-coder:14b");
    telemetry = coordinator.getTelemetry();
    assert.equal(telemetry.hits, 1);
    assert.equal(telemetry.misses, 1);
    assert.equal(telemetry.hitRatio, 0.5);
  });

  it("handles explicit preloadModel invocation and input validation", async () => {
    let preloadInvoked = false;
    const mockProvider: any = {
      isModelResident: async () => false,
      preloadModel: async (model: string) => {
        if (model === "qwen2.5-coder:7b-instruct-q4_K_M") {
          preloadInvoked = true;
        }
      },
    };

    const coordinator = new VramPrefetchCoordinator({
      ollamaProvider: mockProvider,
    });

    await assert.rejects(
      async () => {
        await coordinator.preloadModel("");
      },
      /Model name must be a non-empty string/,
    );

    const success = await coordinator.preloadModel(
      "qwen2.5-coder:7b-instruct-q4_K_M",
    );
    assert.equal(success, true);
    assert.equal(preloadInvoked, true);
  });
});
