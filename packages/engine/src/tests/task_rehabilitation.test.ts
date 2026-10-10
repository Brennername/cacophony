import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { TaskRecord } from "@cacophony/shared-types";
import { TaskRehabilitationService } from "../scheduler/TaskRehabilitationService.js";

describe("TaskRehabilitationService Test Suite (T99.3)", () => {
  const createMockTask = (options: {
    id: string;
    title: string;
    focusFiles?: string;
    failureCount?: number;
    rehabStatus?: "NONE" | "PENDING_REHAB" | "REHABILITATED" | "DECOMPOSED";
  }): TaskRecord => ({
    id: options.id,
    title: options.title,
    prompt: `Complete implementation for ${options.title}`,
    role: "implementer",
    status: "FAILED",
    priority: "P1",
    modelAssigned: "qwen2.5-coder:7b",
    testCommand: "npm test",
    focusFiles: options.focusFiles ?? "packages/engine/src/service.ts",
    targetBranch: "master",
    prUrl: null,
    failureCount: options.failureCount ?? 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    rehabStatus: options.rehabStatus ?? "PENDING_REHAB"
  });

  it("decomposes a multi-file task into Types, Implementation, and Test subtasks", () => {
    const mockRepo: any = {};
    const service = new TaskRehabilitationService({
      taskRepo: mockRepo,
      maxRetriesBeforeRehab: 3
    });

    const failedTask = createMockTask({
      id: "T99.2",
      title: "Full Auth Engine & JWT Service",
      focusFiles: "packages/engine/src/types.ts, packages/engine/src/AuthService.ts, packages/engine/src/tests/auth.test.ts"
    });

    const subtasks = service.decomposeTask(
      failedTask,
      "MonorepoBuildGate failed: missing type export and test timeout",
      "commit-abc1234"
    );

    assert.equal(subtasks.length, 3);
    assert.equal(subtasks[0]!.role, "type_specialist");
    assert.equal(subtasks[0]!.title.includes("Type Contracts"), true);
    assert.equal(subtasks[0]!.focusFiles, "packages/engine/src/types.ts");
    assert.equal(subtasks[0]!.parentTaskId, "T99.2");

    assert.equal(subtasks[1]!.role, "implementer");
    assert.equal(subtasks[1]!.title.includes("Core Implementation"), true);
    assert.equal(subtasks[1]!.focusFiles, "packages/engine/src/AuthService.ts");

    assert.equal(subtasks[2]!.role, "test_engineer");
    assert.equal(subtasks[2]!.title.includes("Unit Test"), true);
    assert.equal(subtasks[2]!.focusFiles, "packages/engine/src/tests/auth.test.ts");
  });

  it("decomposes a single-file task into Scaffold and Implementation subtasks", () => {
    const mockRepo: any = {};
    const service = new TaskRehabilitationService({
      taskRepo: mockRepo,
      maxRetriesBeforeRehab: 3
    });

    const failedTask = createMockTask({
      id: "T99.3",
      title: "Single File Worker Pool",
      focusFiles: "packages/engine/src/WorkerPool.ts"
    });

    const subtasks = service.decomposeTask(
      failedTask,
      "ExecutionTimeoutError after 60000ms"
    );

    assert.equal(subtasks.length, 2);
    assert.equal(subtasks[0]!.role, "type_specialist");
    assert.equal(subtasks[0]!.title.includes("Scaffold"), true);
    assert.equal(subtasks[1]!.role, "implementer");
    assert.equal(subtasks[1]!.title.includes("Implementation"), true);
  });

  it("evaluates shouldRehabilitate correctly against retry threshold", () => {
    const mockRepo: any = {};
    const service = new TaskRehabilitationService({
      taskRepo: mockRepo,
      maxRetriesBeforeRehab: 3
    });

    const lowRetryTask = createMockTask({ id: "T1", title: "Task 1", failureCount: 1 });
    const thresholdTask = createMockTask({ id: "T2", title: "Task 2", failureCount: 3 });
    const highRetryTask = createMockTask({ id: "T3", title: "Task 3", failureCount: 4 });

    assert.equal(service.shouldRehabilitate(lowRetryTask), false);
    assert.equal(service.shouldRehabilitate(thresholdTask), true);
    assert.equal(service.shouldRehabilitate(highRetryTask), true);
  });

  it("persists decomposed subtasks in repo and updates taskcade markdown", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "taskcade-test-"));
    const taskcadeFile = path.join(tmpDir, "taskcade.md");
    await fs.writeFile(
      taskcadeFile,
      "# Active Taskcade\n\n## Phase 1: Bootstrap\n- [x] Initial setup\n",
      "utf-8"
    );

    const createdSubtasks: TaskRecord[] = [];
    let updatedRehabStatus = "";
    let loggedSnippet = "";

    const mockRepo: any = {
      create: async (task: TaskRecord) => {
        createdSubtasks.push(task);
        return task;
      },
      updateRehabStatus: async (_id: string, status: string) => {
        updatedRehabStatus = status;
      },
      updateLogSnippet: async (_id: string, snippet: string) => {
        loggedSnippet = snippet;
      },
      listByParentTaskId: async () => []
    };

    const service = new TaskRehabilitationService({
      taskRepo: mockRepo,
      taskcadePath: taskcadeFile,
      maxRetriesBeforeRehab: 3
    });

    const failedTask = createMockTask({
      id: "T99.4",
      title: "Complex Distributed Scheduler",
      focusFiles: "packages/engine/src/types.ts, packages/engine/src/Scheduler.ts"
    });

    const plan = await service.rehabilitateTask(
      failedTask,
      "Repeated compile error in Scheduler.ts",
      "commit-789def"
    );

    assert.equal(plan.parentTaskId, "T99.4");
    assert.equal(plan.decomposedTasks.length, 3);
    assert.equal(createdSubtasks.length, 3);
    assert.equal(createdSubtasks[0]!.id, "T99.4.1");
    assert.equal(createdSubtasks[1]!.id, "T99.4.2");
    assert.equal(createdSubtasks[2]!.id, "T99.4.3");
    assert.equal(updatedRehabStatus, "DECOMPOSED");
    assert(loggedSnippet.includes("Decomposed into 3 subtasks"));

    // Verify taskcade.md was written with rehabilitation section
    const taskcadeContent = await fs.readFile(taskcadeFile, "utf-8");
    assert(taskcadeContent.includes("## Rehabilitated Taskcade Queue"));
    assert(taskcadeContent.includes("Task T99.4 Rehabilitation"));
    assert(taskcadeContent.includes("commit-789def"));
    assert(taskcadeContent.includes("`T99.4.1`:"));

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("is idempotent and does not recreate subtasks if already DECOMPOSED", async () => {
    const existingChildren: TaskRecord[] = [
      createMockTask({ id: "T99.5.1", title: "Subtask 1" })
    ];

    const mockRepo: any = {
      listByParentTaskId: async () => existingChildren,
      create: async () => {
        throw new Error("Should not be called");
      }
    };

    const service = new TaskRehabilitationService({
      taskRepo: mockRepo,
      maxRetriesBeforeRehab: 3
    });

    const alreadyDecomposed = createMockTask({
      id: "T99.5",
      title: "Already Decomposed Task",
      rehabStatus: "DECOMPOSED"
    });

    const plan = await service.rehabilitateTask(
      alreadyDecomposed,
      "Prior error"
    );

    assert.equal(plan.decomposedTasks.length, 1);
    assert.equal(plan.decomposedTasks[0]!.title, "Subtask 1");
  });
});
