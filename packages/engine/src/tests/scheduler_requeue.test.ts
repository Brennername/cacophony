import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord } from "@cacophony/shared-types";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";

describe("TaskScheduler Resilience & Deterministic Rehabilitation (T99.2)", () => {
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
    completedAt: null
  });

  const createMockEvictionManager = () =>
    ({
      getEjectedModels: () => new Set<string>(),
      recordRunOutcome: async () => {}
    }) as any;

  const createMockTelemetry = () =>
    ({
      getCurrentSnapshot: async () => ({
        timestamp: Date.now(),
        edgeTempC: 45,
        junctionTempC: 50,
        apuPowerWatts: 15,
        memoryUsedBytes: 1024,
        memoryTotalBytes: 4096,
        inferenceTokensPerSec: 25
      })
    }) as any;

  it("requeues task as PENDING when failureCount is below maxRetries", async () => {
    let currentStatus = "PENDING";
    let failureCount = 0;
    let loggedSnippet = "";

    const task = createMockTask("task-retry-1", 0);

    const mockTaskRepo = {
      listPending: async () => (currentStatus === "PENDING" ? [task] : []),
      updateStatus: async (_id: string, status: string) => {
        currentStatus = status;
      },
      updateModel: async () => {},
      updateLogSnippet: async (_id: string, snippet: string) => {
        loggedSnippet = snippet;
      },
      updateCommitAttribution: async () => {},
      incrementFailure: async () => {
        failureCount++;
        return failureCount;
      }
    } as any;

    const mockStageRepo = {
      recordStageStart: async () => 1,
      recordStageCompletion: async () => {}
    } as any;

    const scheduler = new TaskScheduler({
      taskRepo: mockTaskRepo,
      stageRepo: mockStageRepo,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: createMockTelemetry(),
      maxRetries: 3
    });

    scheduler.setExecutionHandler(async () => {
      return {
        success: false,
        tokensPerSec: 10,
        failureReason: "Compilation error: missing symbol"
      };
    });

    await scheduler.tick();

    // The task must be requeued as PENDING, NOT permanently FAILED on attempt 1!
    assert.equal(currentStatus, "PENDING");
    assert.equal(failureCount, 1);
    assert(loggedSnippet.includes("Attempt 1/3 Failed"));
  });

  it("marks task FAILED and triggers rehabilitation when failureCount reaches maxRetries", async () => {
    let currentStatus = "PENDING";
    let failureCount = 2; // will increment to 3 (maxRetries)
    let rehabTriggered = false;
    let rehabParentId = "";

    const task = createMockTask("task-rehab-1", 2);

    const mockTaskRepo = {
      listPending: async () => (currentStatus === "PENDING" ? [task] : []),
      updateStatus: async (_id: string, status: string) => {
        currentStatus = status;
      },
      updateModel: async () => {},
      updateLogSnippet: async () => {},
      updateRehabStatus: async () => {},
      incrementFailure: async () => {
        failureCount++;
        return failureCount;
      }
    } as any;

    const mockStageRepo = {
      recordStageStart: async () => 1,
      recordStageCompletion: async () => {}
    } as any;

    const mockRehabService = {
      rehabilitateTask: async (failedTask: TaskRecord, _reason: string) => {
        rehabTriggered = true;
        rehabParentId = failedTask.id;
        return {
          parentTaskId: failedTask.id,
          failureReason: "Repeated verification failure",
          rationale: "Decomposed",
          decomposedTasks: []
        };
      }
    } as any;

    const scheduler = new TaskScheduler({
      taskRepo: mockTaskRepo,
      stageRepo: mockStageRepo,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: createMockTelemetry(),
      rehabilitationService: mockRehabService,
      maxRetries: 3
    });

    scheduler.setExecutionHandler(async () => {
      return {
        success: false,
        tokensPerSec: 10,
        failureReason: "Repeated verification failure"
      };
    });

    await scheduler.tick();

    // Max retries reached: must transition to FAILED and invoke rehabilitation
    assert.equal(currentStatus, "FAILED");
    assert.equal(failureCount, 3);
    assert.equal(rehabTriggered, true);
    assert.equal(rehabParentId, "task-rehab-1");
  });

  it("attaches commit attribution on successful execution", async () => {
    let updatedCommitHash = "";
    let updatedBaseCommit = "";
    let finalStatus = "";

    const task = createMockTask("task-success-1", 0);

    const mockTaskRepo = {
      listPending: async () => [task],
      updateStatus: async (_id: string, status: string) => {
        finalStatus = status;
      },
      updateModel: async () => {},
      updateCommitAttribution: async (_id: string, commitHash: string, baseCommit?: string | null) => {
        updatedCommitHash = commitHash;
        updatedBaseCommit = baseCommit ?? "";
      }
    } as any;

    const mockStageRepo = {
      recordStageStart: async () => 1,
      recordStageCompletion: async () => {}
    } as any;

    const scheduler = new TaskScheduler({
      taskRepo: mockTaskRepo,
      stageRepo: mockStageRepo,
      evictionManager: createMockEvictionManager(),
      telemetryProvider: createMockTelemetry()
    });

    scheduler.setExecutionHandler(async () => {
      return {
        success: true,
        tokensPerSec: 35.5,
        commitHash: "hash-new-commit-456",
        baseCommitHash: "hash-base-commit-123"
      };
    });

    await scheduler.tick();

    assert.equal(finalStatus, "COMPLETED");
    assert.equal(updatedCommitHash, "hash-new-commit-456");
    assert.equal(updatedBaseCommit, "hash-base-commit-123");
  });
});
