import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord } from "@cacophony/shared-types";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import { OllamaStateProbe } from "../scheduler/OllamaStateProbe.js";
import type { GroomedTask } from "../scheduler/QueueGroomer.js";
import type { IHardwareTelemetryProvider } from "../telemetry/IHardwareTelemetryProvider.js";

describe("TaskScheduler Dynamic VRAM Headroom Check (T68.2.3, T68.2.4)", () => {
  const createMockTask = (id: string, model: string, priority: "P0" | "P1" = "P1"): TaskRecord => ({
    id,
    title: `Task ${id}`,
    prompt: `Execute task ${id}`,
    role: "architect",
    status: "PENDING",
    priority,
    modelAssigned: model,
    testCommand: "npm test",
    focusFiles: "src/main.ts",
    targetBranch: "master",
    prUrl: null,
    failureCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  });

  const createMockEvictionManager = () =>
    ({
      selectModel: async (_role: string, candidates: string[]) => candidates[0] ?? "qwen2.5-coder:7b",
      getEjectedModels: () => new Set<string>(),
      recordRunOutcome: async () => {},
    }) as any;

  const createHeadroomTelemetry = (freeVramMb: number): IHardwareTelemetryProvider => ({
    getName: () => "MockAmdVegaTelemetryProvider",
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
      const safetyMarginMb = 1024;
      return freeVramMb >= requiredMb + safetyMarginMb;
    },
    getVramMetrics: async () => ({
      totalBytes: 8192 * 1024 * 1024,
      usedBytes: Math.max(0, 8192 - freeVramMb) * 1024 * 1024,
      freeBytes: freeVramMb * 1024 * 1024,
    }),
  });

  it("canDispatch defers heavy 8b task when free VRAM is constrained (4000 MB) but allows 3b task", async () => {
    // 4000 MB free VRAM:
    // deepseek-r1:8b needs 6822 MB + 1024 MB buffer = 7846 MB -> insufficient
    // qwen2.5-coder:3b needs 2509 MB + 1024 MB buffer = 3533 MB -> sufficient
    const telemetry = createHeadroomTelemetry(4000);
    const scheduler = new TaskScheduler({
      taskRepo: { listPending: async () => [] } as any,
      stageRepo: {} as any,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: telemetry,
    });

    const task8b = createMockTask("task-heavy-8b", "deepseek-r1:8b");
    const task3b = createMockTask("task-light-3b", "qwen2.5-coder:3b");

    const canRun8b = await scheduler.canDispatch(task8b, "deepseek-r1:8b");
    assert.equal(canRun8b, false, "8b task should be deferred when available free VRAM is only 4000 MB");

    const canRun3b = await scheduler.canDispatch(task3b, "qwen2.5-coder:3b");
    assert.equal(canRun3b, true, "3b task should be permitted when available free VRAM is 4000 MB");
  });

  it("scheduler.tick defers top-of-queue 8b task and dispatches lighter 3b task when VRAM is constrained", async () => {
    // Queue has two pending tasks:
    // P0: 8b task (top of queue)
    // P1: 3b task
    const task8b = createMockTask("task-8b", "deepseek-r1:8b", "P0");
    const task3b = createMockTask("task-3b", "qwen2.5-coder:3b", "P1");

    let currentPending = [task8b, task3b];
    let executedTaskId: string | null = null;
    let executedModel: string | null = null;

    const mockTaskRepo = {
      listPending: async () => currentPending,
      updateStatus: async (id: string, _status: string) => {
        currentPending = currentPending.filter((t) => t.id !== id);
      },
      updateModel: async () => {},
      updateCommitAttribution: async () => {},
      updateLogSnippet: async () => {},
    } as any;

    const mockStageRepo = {
      recordStageStart: async () => 1,
      recordStageCompletion: async () => {},
    } as any;

    // Free VRAM = 4000 MB
    const telemetry = createHeadroomTelemetry(4000);
    const probe = new OllamaStateProbe();
    probe.setSimulatedInstalledModels(["deepseek-r1:8b", "qwen2.5-coder:3b"]);

    const scheduler = new TaskScheduler({
      taskRepo: mockTaskRepo,
      stageRepo: mockStageRepo,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: telemetry,
      probe,
    });

    scheduler.setExecutionHandler(async (groomed: GroomedTask, selectedModel: string) => {
      executedTaskId = groomed.task.id;
      executedModel = selectedModel;
      return { success: true, tokensPerSec: 30 };
    });

    const dispatched = await scheduler.tick(true);

    assert.ok(dispatched, "Scheduler should have dispatched a qualifying task");
    assert.equal(dispatched.id, "task-3b", "Scheduler must defer 8b task and dispatch lighter 3b task");
    assert.equal(executedTaskId, "task-3b");
    assert.equal(executedModel, "qwen2.5-coder:3b");
  });

  it("scheduler.tick defers all tasks and returns null when VRAM is critically constrained", async () => {
    const task8b = createMockTask("task-8b", "deepseek-r1:8b", "P0");
    const task3b = createMockTask("task-3b", "qwen2.5-coder:3b", "P1");

    let executed = false;

    // Free VRAM = 1000 MB: even 3b requires 2509 + 1024 = 3533 MB
    const telemetry = createHeadroomTelemetry(1000);

    const scheduler = new TaskScheduler({
      taskRepo: { listPending: async () => [task8b, task3b] } as any,
      stageRepo: {} as any,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: telemetry,
    });

    scheduler.setExecutionHandler(async () => {
      executed = true;
      return { success: true, tokensPerSec: 30 };
    });

    const result = await scheduler.tick(true);

    assert.equal(result, null, "Scheduler should return null when no tasks fit into available VRAM");
    assert.equal(executed, false, "Execution handler should not have been invoked");
  });

  it("scheduler.tick dispatches top-priority 8b task when sufficient VRAM headroom exists", async () => {
    const task8b = createMockTask("task-8b", "deepseek-r1:8b", "P0");
    const task3b = createMockTask("task-3b", "qwen2.5-coder:3b", "P1");

    let executedTaskId: string | null = null;

    // Free VRAM = 9000 MB: 8b requires 6822 + 1024 = 7846 MB <= 9000 MB
    const telemetry = createHeadroomTelemetry(9000);

    const scheduler = new TaskScheduler({
      taskRepo: {
        listPending: async () => [task8b, task3b],
        updateStatus: async () => {},
        updateModel: async () => {},
      } as any,
      stageRepo: {
        recordStageStart: async () => 1,
        recordStageCompletion: async () => {},
      } as any,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: telemetry,
    });

    scheduler.setExecutionHandler(async (groomed: GroomedTask) => {
      executedTaskId = groomed.task.id;
      return { success: true, tokensPerSec: 20 };
    });

    const dispatched = await scheduler.tick(true);

    assert.ok(dispatched);
    assert.equal(dispatched.id, "task-8b", "Should dispatch top-priority 8b task when sufficient VRAM exists");
    assert.equal(executedTaskId, "task-8b");
  });
});
