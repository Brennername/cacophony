import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord } from "@cacophony/shared-types";
import { QueueGroomer } from "../scheduler/QueueGroomer.js";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import { OllamaStateProbe } from "../scheduler/OllamaStateProbe.js";

/**
 * Authentic test suite for Warm Model Affinity & Starvation Cap (T68.3).
 * Validates that:
 * 1. QueueGroomer bumps warm model tasks to the head of candidates.
 * 2. QueueGroomer prevents starvation by capping consecutive warm executions at 5.
 * 3. TaskScheduler queries loaded model from OllamaStateProbe with 5-second TTL cache.
 */
describe("Warm Model Affinity & Starvation Cap Suite (T68.3)", () => {
  const createTask = (id: string, model: string | null): TaskRecord => ({
    id,
    title: `Task ${id}`,
    prompt: `Execute task ${id}`,
    role: "implementer",
    status: "PENDING",
    priority: "P1",
    modelAssigned: model,
    testCommand: "npm test",
    focusFiles: "src/sample.ts",
    targetBranch: "master",
    prUrl: null,
    failureCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  });

  describe("QueueGroomer.sortByWarmModelAffinity (T68.3.2)", () => {
    it("should bump tasks assigned to warm model to the top while preserving relative ordering", () => {
      const groomer = new QueueGroomer();
      const tasks: TaskRecord[] = [
        createTask("task-1", "qwen2.5-coder:7b"),
        createTask("task-2", "deepseek-coder:6.7b"),
        createTask("task-3", "qwen2.5-coder:7b"),
        createTask("task-4", "starcoder2:7b"),
        createTask("task-5", null),
      ];

      const sorted = groomer.sortByWarmModelAffinity(tasks, "qwen2.5-coder:7b");

      // Warm tasks (1 and 3) must appear first
      assert.equal(sorted[0]?.id, "task-1");
      assert.equal(sorted[1]?.id, "task-3");
      // Other tasks preserve relative ordering
      assert.equal(sorted[2]?.id, "task-2");
      assert.equal(sorted[3]?.id, "task-4");
      assert.equal(sorted[4]?.id, "task-5");
    });

    it("should return original list unchanged when warmModel is null or undefined", () => {
      const groomer = new QueueGroomer();
      const tasks: TaskRecord[] = [
        createTask("task-1", "qwen2.5-coder:7b"),
        createTask("task-2", "deepseek-coder:6.7b"),
      ];

      const sorted = groomer.sortByWarmModelAffinity(tasks, null);
      assert.deepEqual(sorted.map((t) => t.id), ["task-1", "task-2"]);
    });
  });

  describe("QueueGroomer.applyStarvationCap (T68.3.3)", () => {
    it("should cap consecutive warm model tasks at 5 and interleave alternative model tasks", () => {
      const groomer = new QueueGroomer();
      const tasks: TaskRecord[] = [
        createTask("warm-1", "qwen2.5-coder:7b"),
        createTask("warm-2", "qwen2.5-coder:7b"),
        createTask("warm-3", "qwen2.5-coder:7b"),
        createTask("warm-4", "qwen2.5-coder:7b"),
        createTask("warm-5", "qwen2.5-coder:7b"),
        createTask("warm-6", "qwen2.5-coder:7b"),
        createTask("warm-7", "qwen2.5-coder:7b"),
        createTask("cold-1", "deepseek-coder:6.7b"),
        createTask("cold-2", "deepseek-coder:6.7b"),
      ];

      const result = groomer.applyStarvationCap(tasks, "qwen2.5-coder:7b", 5);

      // First 5 tasks are warm
      assert.equal(result[0]?.id, "warm-1");
      assert.equal(result[1]?.id, "warm-2");
      assert.equal(result[2]?.id, "warm-3");
      assert.equal(result[3]?.id, "warm-4");
      assert.equal(result[4]?.id, "warm-5");

      // 6th task MUST be cold-1 to break starvation
      assert.equal(result[5]?.id, "cold-1");

      // Then remaining warm tasks followed by cold-2
      assert.equal(result[6]?.id, "warm-6");
      assert.equal(result[7]?.id, "warm-7");
      assert.equal(result[8]?.id, "cold-2");
    });

    it("should return original list if all tasks belong to warm model", () => {
      const groomer = new QueueGroomer();
      const tasks: TaskRecord[] = [
        createTask("warm-1", "qwen2.5-coder:7b"),
        createTask("warm-2", "qwen2.5-coder:7b"),
      ];

      const result = groomer.applyStarvationCap(tasks, "qwen2.5-coder:7b", 5);
      assert.deepEqual(result.map((t) => t.id), ["warm-1", "warm-2"]);
    });
  });

  describe("TaskScheduler.queryLoadedModels (T68.3.1)", () => {
    it("should probe Ollama, cache results with 5-second TTL, and honor forceRefresh", async () => {
      const probe = new OllamaStateProbe();
      probe.setSimulatedModel("qwen2.5-coder:7b");

      const mockTaskRepo = {
        listPending: async () => [],
        updateStatus: async () => {},
      } as any;

      const mockTelemetry = {
        getName: () => "MockTelemetry",
        isAvailable: async () => true,
        sample: async () => ({ vramUsedBytes: 0, vramTotalBytes: 8192 * 1024 * 1024 }),
        checkVramHeadroom: () => true,
        getVramMetrics: async () => ({ totalBytes: 8192 * 1024 * 1024, usedBytes: 0, freeBytes: 8192 * 1024 * 1024 }),
      } as any;

      const scheduler = new TaskScheduler({
        taskRepo: mockTaskRepo,
        stageRepo: {} as any,
        evictionManager: {
          selectModel: async () => "qwen2.5-coder:7b",
          getEjectedModels: () => new Set<string>(),
          recordRunOutcome: async () => {},
        } as any,
        telemetryProvider: mockTelemetry,
        probe,
      });

      // First query populates cache
      const models1 = await scheduler.queryLoadedModels();
      assert.deepEqual(models1, ["qwen2.5-coder:7b"]);

      // Change probe simulated model
      probe.setSimulatedModel("deepseek-coder:6.7b");

      // Within 5000ms TTL, cached result is returned
      const models2 = await scheduler.queryLoadedModels();
      assert.deepEqual(models2, ["qwen2.5-coder:7b"]);

      // Force refresh bypasses cache
      const models3 = await scheduler.queryLoadedModels(true);
      assert.deepEqual(models3, ["deepseek-coder:6.7b"]);
    });
  });
});
