import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import { FleetHealthMonitor } from "../fleet/FleetHealthMonitor.js";
import { DistributedTaskDispatcher } from "../scheduler/DistributedTaskDispatcher.js";
import type { TaskRecord, TaskPriority } from "@cacophony/shared-types";

describe("Distributed TaskScheduler Integration Suite (T86.2.2)", () => {
  function createMockTask(
    id: string,
    model: string,
    priority: TaskPriority = "P1",
  ): TaskRecord {
    return {
      id,
      title: `Task for model ${model}`,
      prompt: "Execute test task",
      role: "implementer",
      status: "PENDING",
      priority,
      modelAssigned: model,
      testCommand: null,
      focusFiles: null,
      targetBranch: "main",
      prUrl: null,
      failureCount: 0,
      logSnippet: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: 0,
      tokensPerSec: 0,
    };
  }

  function setupSchedulerWithFleet(pendingTasks: TaskRecord[]) {
    const monitor = new FleetHealthMonitor();

    // Register local orchestrator node
    monitor.recordHeartbeat({
      nodeId: "orchestrator-local",
      hostname: "orchestrator.local",
      ipAddress: "127.0.0.1",
      port: 24072,
      gpuType: "AMD_VEGA",
      vramTotalMb: 8192,
      vramUsedMb: 4096, // 4096 free
      gpuBusyPercent: 20,
      temperatureCelsius: 52,
      status: "ONLINE",
      activeTasksCount: 0,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "local",
      activeMemoryUsage: 2048,
      apuThermal: 45,
      gpuThermal: 52,
    });

    // Register remote heavy compute node
    monitor.recordHeartbeat({
      nodeId: "node-heavy-gpu",
      hostname: "gpu-node-01.lan",
      ipAddress: "192.168.1.50",
      port: 24074,
      gpuType: "NVIDIA_CUDA",
      vramTotalMb: 24576,
      vramUsedMb: 2048, // 22528 free
      gpuBusyPercent: 10,
      temperatureCelsius: 44,
      status: "ONLINE",
      activeTasksCount: 0,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: "remote1",
      activeMemoryUsage: 4096,
      apuThermal: 40,
      gpuThermal: 44,
    });

    const dispatcher = new DistributedTaskDispatcher(
      monitor,
      "orchestrator-local",
    );

    let currentTasks = [...pendingTasks];
    const statusHistory: Record<string, string[]> = {};
    const updatedModels: Record<string, string> = {};

    const mockTaskRepo = {
      listPending: async () =>
        currentTasks.filter(
          (t) => t.status !== "RUNNING" && t.status !== "COMPLETED",
        ),
      updateStatus: async (id: string, status: string) => {
        statusHistory[id] = statusHistory[id] || [];
        statusHistory[id].push(status);
        const task = currentTasks.find((t) => t.id === id);
        if (task) (task as any).status = status;
      },
      updateModel: async (id: string, model: string) => {
        updatedModels[id] = model;
        const task = currentTasks.find((t) => t.id === id);
        if (task) (task as any).modelAssigned = model;
      },
      updateLogSnippet: async () => {},
      updateRehabStatus: async () => {},
      incrementFailure: async () => 1,
    } as any;

    const mockStageRepo = {
      recordStageStart: async () => 1,
      recordStageCompletion: async () => {},
    } as any;

    const mockEvictionManager = {
      selectModel: async (_role: string, candidateList: string[]) =>
        candidateList[0] ?? "qwen2.5-coder:7b",
      recordRunOutcome: async () => {},
    } as any;

    const mockTelemetryProvider = {
      sample: async () => ({
        edgeTempCelsius: 50,
        junctionTempCelsius: 55,
        vramUsedBytes: 4096 * 1024 * 1024,
        vramTotalBytes: 8192 * 1024 * 1024,
        gpuBusyPercent: 20,
        pptWatts: 25,
        sclkMhz: 1200,
        mclkMhz: 1000,
        timestamp: new Date().toISOString(),
      }),
    } as any;

    const scheduler = new TaskScheduler({
      taskRepo: mockTaskRepo,
      stageRepo: mockStageRepo,
      evictionManager: mockEvictionManager,
      telemetryProvider: mockTelemetryProvider,
      dispatcher,
      defaultTimeoutMs: 10000,
      autoReplenish: false,
    });

    return {
      scheduler,
      dispatcher,
      monitor,
      currentTasks,
      statusHistory,
      updatedModels,
    };
  }

  it("should offload compute-intensive model (deepseek-coder-v2:16b) to heavy compute node", async () => {
    const task = createMockTask("task-heavy-01", "deepseek-coder-v2:16b");
    const { scheduler, statusHistory } = setupSchedulerWithFleet([task]);

    scheduler.setExecutionHandler(async () => {
      return { success: true, tokensPerSec: 28.5 };
    });

    const result = await scheduler.tick();
    assert.ok(result, "Tick should return executed task");
    assert.equal(result.id, "task-heavy-01");

    const placement = scheduler.getLastPlacementDecision();
    assert.ok(placement, "Placement decision should be recorded");
    assert.equal(
      placement.isLocal,
      false,
      "Compute-intensive task must be offloaded",
    );
    assert.equal(placement.nodeId, "node-heavy-gpu");
    assert.equal(placement.targetHost, "192.168.1.50");
    assert.ok(statusHistory["task-heavy-01"]?.includes("RUNNING"));
    assert.equal(statusHistory["task-heavy-01"]?.at(-1), "COMPLETED");
  });

  it("should retain light model locally on orchestrator node", async () => {
    const task = createMockTask("task-light-01", "gemma3:4b-it-qat");
    const { scheduler } = setupSchedulerWithFleet([task]);

    scheduler.setExecutionHandler(async () => {
      return { success: true, tokensPerSec: 35.0 };
    });

    const result = await scheduler.tick();
    assert.ok(result, "Tick should return executed task");

    const placement = scheduler.getLastPlacementDecision();
    assert.ok(placement, "Placement decision should be recorded");
    assert.equal(placement.isLocal, true);
    assert.equal(placement.nodeId, "orchestrator-local");
  });

  it("should expose getter and setter for DistributedTaskDispatcher", () => {
    const monitor = new FleetHealthMonitor();
    const dispatcher1 = new DistributedTaskDispatcher(monitor, "node-1");
    const dispatcher2 = new DistributedTaskDispatcher(monitor, "node-2");

    const mockTaskRepo = { listPending: async () => [] } as any;
    const mockStageRepo = {
      recordStageStart: async () => 1,
      recordStageCompletion: async () => {},
    } as any;
    const mockEvictionManager = { selectModel: async () => "m1" } as any;
    const mockTelemetryProvider = { sample: async () => ({}) } as any;

    const scheduler = new TaskScheduler({
      taskRepo: mockTaskRepo,
      stageRepo: mockStageRepo,
      evictionManager: mockEvictionManager,
      telemetryProvider: mockTelemetryProvider,
      dispatcher: dispatcher1,
      autoReplenish: false,
    });

    assert.equal(scheduler.getDispatcher(), dispatcher1);
    scheduler.setDispatcher(dispatcher2);
    assert.equal(scheduler.getDispatcher(), dispatcher2);
  });
});
