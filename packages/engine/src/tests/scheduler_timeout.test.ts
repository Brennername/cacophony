import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import { FailureClassifier, ExecutionTimeoutError } from "../analytics/FailureClassifier.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("T47.2: Task Execution Timeout & Deadlock Watchdog", () => {
  it("T47.2.2: FailureClassifier correctly classifies ExecutionTimeoutError as TIMEOUT category", () => {
    const error = new ExecutionTimeoutError("Stalled inference stream", 5000, "task-123", "qwen2.5-coder:7b");
    assert.equal(error.name, "ExecutionTimeoutError");
    assert.equal(error.timeoutMs, 5000);
    assert.equal(error.taskId, "task-123");
    assert.equal(error.model, "qwen2.5-coder:7b");

    const classificationFromError = FailureClassifier.classify(error);
    assert.equal(classificationFromError.category, "TIMEOUT");

    const classificationFromMsg = FailureClassifier.classify(
      "Task execution exceeded allocated timeout of 5000ms for model 'qwen2.5-coder:7b'"
    );
    assert.equal(classificationFromMsg.category, "TIMEOUT");
    assert.equal(classificationFromMsg.matchedPattern, "timeout_signal");
  });

  it("T47.2.1 & T47.2.3: TaskScheduler watchdog aborts stalled tasks and records TIMEOUT failure", async () => {
    let updatedStatus: string | null = null;
    let completionVerdict: string | null = null;
    let completionMessage: string = "";
    let failureCountIncremented = false;

    const mockTask: TaskRecord = {
      id: "task-timeout-test",
      title: "Simulate hanging LLM stream",
      prompt: "Hang forever",
      role: "implementer",
      status: "PENDING",
      priority: "P1",
      modelAssigned: "qwen2.5-coder:3b",
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
      tokensPerSec: 0
    };

    const mockTaskRepo = {
      listPending: async () => [mockTask],
      updateStatus: async (_id: string, status: string) => {
        updatedStatus = status;
      },
      updateModel: async () => {},
      incrementFailure: async () => {
        failureCountIncremented = true;
      }
    } as any;

    const mockStageRepo = {
      recordStageStart: async () => 101,
      recordStageCompletion: async (
        _id: number,
        status: string,
        logOutput: string
      ) => {
        completionVerdict = status;
        completionMessage = logOutput;
      }
    } as any;

    const mockEvictionManager = {
      selectModel: async () => "qwen2.5-coder:3b",
      recordRunOutcome: async () => {}
    } as any;

    const mockTelemetryProvider = {
      sample: async () => ({
        edgeTempCelsius: 50,
        junctionTempCelsius: 55,
        vramUsedBytes: 1024,
        vramTotalBytes: 16384,
        gpuBusyPercent: 10,
        pptWatts: 15,
        sclkMhz: 1000,
        mclkMhz: 1000,
        timestamp: new Date().toISOString()
      })
    } as any;

    // Configure scheduler with very low timeout (50ms) for the test
    const scheduler = new TaskScheduler({
      taskRepo: mockTaskRepo,
      stageRepo: mockStageRepo,
      evictionManager: mockEvictionManager,
      telemetryProvider: mockTelemetryProvider,
      defaultTimeoutMs: 50,
      perModelTimeoutMs: {
        "qwen2.5-coder:3b": 50
      }
    });

    // Simulate an execution handler that hangs for 200ms
    scheduler.setExecutionHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true, tokensPerSec: 25.0 };
    });

    scheduler.start();
    const executed = await scheduler.tick();
    scheduler.stop();

    assert.ok(executed);
    assert.equal(executed?.id, "task-timeout-test");
    assert.equal(updatedStatus, "FAILED");
    assert.equal(completionVerdict, "FAILURE");
    assert.ok(completionMessage?.includes("[TIMEOUT]"));
    assert.ok(failureCountIncremented);
  });
});
