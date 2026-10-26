import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OllamaStateProbe } from "../scheduler/OllamaStateProbe.js";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import { ModelEvictionManager } from "../scheduler/ModelEvictionManager.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("Dynamic Model Discovery and Safe Eviction Suite", () => {
  it("OllamaStateProbe returns simulated installed models and normalizes tags", async () => {
    const probe = new OllamaStateProbe();
    probe.setSimulatedInstalledModels([
      "openai/deepseek-coder-v2:16b",
      "ollama_chat/qwen2.5-coder:7b-instruct-q4_K_M",
    ]);

    const installed = await probe.getInstalledModels();
    assert.deepEqual(installed, [
      "openai/deepseek-coder-v2:16b",
      "ollama_chat/qwen2.5-coder:7b-instruct-q4_K_M",
    ]);
  });

  it("TaskScheduler filters candidate models to dynamically installed models", async () => {
    const probe = new OllamaStateProbe();
    probe.setSimulatedInstalledModels([
      "deepseek-coder-v2:16b",
      "qwen2.5-coder:7b-instruct-q4_K_M",
    ]);

    let capturedCandidates: readonly string[] = [];

    const mockEvictionManager = {
      selectModel: async (_role: any, candidates: readonly string[]) => {
        capturedCandidates = candidates;
        return candidates[0]!;
      },
      getEjectedModels: () => new Set<string>(),
      recordRunOutcome: async () => {},
    } as unknown as ModelEvictionManager;

    const mockTelemetry = {
      getName: () => "MockTelemetry",
      isAvailable: async () => true,
      sample: async () => ({
        vramUsedBytes: 0,
        vramTotalBytes: 16384 * 1024 * 1024,
        edgeTempCelsius: 50,
      }),
      checkVramHeadroom: () => true,
      getVramMetrics: async () => ({
        totalBytes: 16384 * 1024 * 1024,
        usedBytes: 0,
        freeBytes: 16384 * 1024 * 1024,
      }),
    } as any;

    const scheduler = new TaskScheduler({
      taskRepo: {} as any,
      stageRepo: {} as any,
      evictionManager: mockEvictionManager,
      telemetryProvider: mockTelemetry,
      probe,
    });

    const unassignedTask: TaskRecord = {
      id: "task-dyn-01",
      role: "implementer",
      status: "PENDING",
      failureCount: 0,
    } as any;

    await scheduler.selectCandidateModel(unassignedTask, null);
    assert.deepEqual(capturedCandidates, [
      "deepseek-coder-v2:16b",
      "qwen2.5-coder:7b-instruct-q4_K_M",
    ]);
  });

  it("TaskScheduler falls back cleanly when assigned model is not installed on disk", async () => {
    const probe = new OllamaStateProbe();
    probe.setSimulatedInstalledModels([
      "deepseek-coder-v2:16b",
      "qwen2.5-coder:7b-instruct-q4_K_M",
    ]);

    let capturedCandidates: readonly string[] = [];

    const mockEvictionManager = {
      selectModel: async (_role: any, candidates: readonly string[]) => {
        capturedCandidates = candidates;
        return candidates[0]!;
      },
      getEjectedModels: () => new Set<string>(),
      recordRunOutcome: async () => {},
    } as unknown as ModelEvictionManager;

    const mockTelemetry = {
      getName: () => "MockTelemetry",
      isAvailable: async () => true,
      sample: async () => ({
        vramUsedBytes: 0,
        vramTotalBytes: 16384 * 1024 * 1024,
        edgeTempCelsius: 50,
      }),
      checkVramHeadroom: () => true,
      getVramMetrics: async () => ({
        totalBytes: 16384 * 1024 * 1024,
        usedBytes: 0,
        freeBytes: 16384 * 1024 * 1024,
      }),
    } as any;

    const scheduler = new TaskScheduler({
      taskRepo: {} as any,
      stageRepo: {} as any,
      evictionManager: mockEvictionManager,
      telemetryProvider: mockTelemetry,
      probe,
    });

    const missingModelTask: TaskRecord = {
      id: "task-dyn-02",
      role: "implementer",
      status: "PENDING",
      modelAssigned: "gemma3:12b-it-qat",
      failureCount: 1, // Has failed before
    } as any;

    const selected = await scheduler.selectCandidateModel(missingModelTask, null);
    assert.equal(selected, "gemma3:12b-it-qat");
    assert.ok(
      capturedCandidates.includes("deepseek-coder-v2:16b"),
      "Fallback candidates must include installed models",
    );
  });

  it("ModelEvictionManager evicts to cooldown without deleting disk weights", async () => {
    let deleteCalled = false;
    const mockModelManager = {
      deleteModel: async () => {
        deleteCalled = true;
        return true;
      },
    } as any;

    const healthRepo = {
      async getProfile(modelId: string) {
        return {
          modelId,
          provider: "ollama",
          totalTasks: 3,
          totalSuccess: 0,
          totalFailures: 3,
          consecutiveFailures: 3,
          status: "ACTIVE",
          avgLatencyMs: 1000,
          avgTokensPerSec: 30,
          lastUsedAt: null,
          totalRemediationAttempts: 0,
          totalRemediationSuccess: 0,
          remediationRecoveryRate: 0,
        };
      },
      async updateStatus(_modelId: string, _status: string) {},
      async recordRun() {},
    };

    const manager = new ModelEvictionManager(
      healthRepo as any,
      3,
      0,
      undefined,
      mockModelManager,
    );

    const result = await manager.evaluateModelEviction("deepseek-coder-v2:16b");
    manager.dispose();

    assert.equal(result.evicted, true);
    assert.equal(
      deleteCalled,
      false,
      "Model weights must NOT be deleted from disk during task eviction",
    );
  });
});
