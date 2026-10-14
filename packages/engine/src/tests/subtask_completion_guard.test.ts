import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord, AgentRole, TaskPriority } from "@cacophony/shared-types";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import { TaskcadeSeedLoader } from "../scheduler/TaskcadeSeedLoader.js";

/**
 * Validates that subtasks and rehabilitated task units are not falsely auto-completed
 * by parent task code prefix matching against archived history, preserving genuine stage execution.
 */
describe("Subtask Completion Guard & Seed Loader Regression Tests", () => {
  const createSubtask = (
    id: string,
    title: string,
    parentTaskId: string | null = null,
  ): TaskRecord => ({
    id,
    title,
    prompt: `Execute ${title}`,
    role: "implementer" as AgentRole,
    status: "PENDING",
    priority: "P1" as TaskPriority,
    modelAssigned: "qwen2.5-coder:7b",
    testCommand: "npm test",
    focusFiles: "src/main.ts",
    targetBranch: "master",
    prUrl: null,
    failureCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    parentTaskId,
  });

  const mockTelemetry = {
    sample: async () => ({
      edgeTempCelsius: 45,
      junctionTempCelsius: 50,
      vramUsedBytes: 1024,
      vramTotalBytes: 4096,
      gpuBusyPercent: 10,
      pptWatts: 15,
      sclkMhz: 1000,
      mclkMhz: 1000,
      timestamp: new Date().toISOString(),
    }),
    getCurrentSnapshot: async () => ({
      timestamp: Date.now(),
      edgeTempC: 45,
      junctionTempC: 50,
      apuPowerWatts: 15,
      memoryUsedBytes: 1024,
      memoryTotalBytes: 4096,
      inferenceTokensPerSec: 25,
    }),
  } as any;

  const mockEvictionManager = {
    selectModel: async () => "qwen2.5-coder:7b",
    getEjectedModels: () => new Set<string>(),
    recordRunOutcome: async () => {},
  } as any;

  it("does not auto-complete a rehabilitated subtask when parent task code exists in completedIds", async () => {
    const parentCode = "t96.5.2";
    const subtask = createSubtask(
      "taskcade-t96.5.2.1.1.2",
      "[Rehab 2/2] Implementation & Test Verification: T96.5.2: Write unit tests verifying TaskRepository",
      "taskcade-t96.5.2.1.1",
    );

    let statusUpdatedTo: string | null = null;
    let dispatchedTask: TaskRecord | null = null;

    const mockTaskRepo = {
      listPending: async () => [subtask],
      updateStatus: async (_id: string, status: string) => {
        statusUpdatedTo = status;
      },
      updateModel: async () => {},
      updateLogSnippet: async () => {},
      updatePr: async () => {},
      incrementFailure: async () => 1,
    } as any;

    const mockStageRepo = {
      recordStageStart: async () => 1,
      recordStageCompletion: async () => {},
      getStagesForTask: async () => [],
    } as any;

    const mockSeedLoader = {
      getCompletedTaskIds: async () => new Set<string>([parentCode, `taskcade-${parentCode}`]),
      loadTasks: async () => [],
    } as any;

    const scheduler = new TaskScheduler({
      taskRepo: mockTaskRepo,
      stageRepo: mockStageRepo,
      telemetryProvider: mockTelemetry,
      evictionManager: mockEvictionManager,
      autoReplenish: false,
    });

    // Wire custom seed loader containing parent code in completed set
    (scheduler as any).seedLoader = mockSeedLoader;

    scheduler.setExecutionHandler(async (groomed) => {
      dispatchedTask = groomed.task;
      return { success: true, tokensPerSec: 25 };
    });

    // Execute scheduler tick
    await scheduler.tick(true);

    // Subtask must NOT be falsely marked COMPLETED without dispatching stages
    assert.equal(
      statusUpdatedTo,
      "COMPLETED",
      "Task should complete through normal execution handler, not premature short-circuiting",
    );
    assert.ok(dispatchedTask, "Subtask must be handed to execution handler to execute stages");
    assert.equal((dispatchedTask as TaskRecord).id, "taskcade-t96.5.2.1.1.2");
  });

  it("TaskcadeSeedLoader parses markdown items formatted with and without backticks", () => {
    const loader = new TaskcadeSeedLoader();
    const markdown = [
      "## Phase 1: Test Phase",
      "- [ ] T101.1.1: Standard unquoted task [Files: src/a.ts] [Test: npm test]",
      "- [ ] `taskcade-t101.1.2`: Backtick-wrapped rehabilitation task [Files: src/b.ts] [Test: npm test]",
      "- [x] `t101.1.3`: Completed backtick task [Files: src/c.ts]",
      "- [x] T101.1.4: Completed standard task [Files: src/d.ts]",
    ].join("\n");

    const parsed = loader.parseMarkdown(markdown);
    assert.equal(parsed.length, 4, "Should parse all 4 checklist items regardless of backticks");

    assert.equal(parsed[0]!.taskId, "taskcade-t101.1.1");
    assert.equal(parsed[0]!.completed, false);

    assert.equal(parsed[1]!.taskId, "taskcade-t101.1.2");
    assert.equal(parsed[1]!.completed, false);

    assert.equal(parsed[2]!.taskId, "taskcade-t101.1.3");
    assert.equal(parsed[2]!.completed, true);

    assert.equal(parsed[3]!.taskId, "taskcade-t101.1.4");
    assert.equal(parsed[3]!.completed, true);
  });
});
