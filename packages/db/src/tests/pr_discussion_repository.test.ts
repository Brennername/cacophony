import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDriver } from "../drivers/SQLiteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { TaskRepository } from "../repositories/TaskRepository.js";
import { PrDiscussionRepository } from "../repositories/PrDiscussionRepository.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("T108.4: PrDiscussionRepository and Migration 021", () => {
  let driver: SQLiteDriver;
  let taskRepo: TaskRepository;
  let discussionRepo: PrDiscussionRepository;

  before(async () => {
    driver = new SQLiteDriver(":memory:");
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();

    taskRepo = new TaskRepository(driver);
    discussionRepo = new PrDiscussionRepository(driver);

    // Seed task
    const task: TaskRecord = {
      id: "task-discuss-001",
      title: "Test PR discussion task",
      prompt: "Implement PR discussion threads",
      role: "implementer",
      status: "RUNNING",
      priority: "P1",
      modelAssigned: "qwen2.5-coder:7b",
      testCommand: "npm test",
      focusFiles: "src/discussion.ts",
      targetBranch: "task/p1-task-discuss-001",
      prUrl: "http://localhost:19634/NeXeN/cacophony/pulls/42",
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    await taskRepo.create(task);
  });

  after(async () => {
    await driver.close();
  });

  test("should record comments, query by task ID and PR index", async () => {
    const comment1 = await discussionRepo.recordComment({
      taskId: "task-discuss-001",
      prIndex: 42,
      authorName: "SecurityBot",
      authorRole: "model:security",
      domainTag: "Security",
      filePath: "src/auth/token.ts",
      lineNumber: 45,
      bodyContent: "Ensure JWT signature verification algorithm is explicitly locked to HS256.",
      isResolved: false,
    });

    assert.ok(comment1.id > 0);
    assert.strictEqual(comment1.taskId, "task-discuss-001");
    assert.strictEqual(comment1.domainTag, "Security");
    assert.strictEqual(comment1.isResolved, false);

    const comment2 = await discussionRepo.recordComment({
      taskId: "task-discuss-001",
      prIndex: 42,
      authorName: "UxAuditor",
      authorRole: "model:ux-ui",
      domainTag: "UX/UI",
      filePath: "src/app/modal.ts",
      lineNumber: 12,
      bodyContent: "Expand embedded scrollable window by default to prevent double scrollers.",
      isResolved: false,
    });

    assert.ok(comment2.id > comment1.id);

    const byTask = await discussionRepo.getCommentsByTaskId("task-discuss-001");
    assert.strictEqual(byTask.length, 2);
    assert.strictEqual(byTask[0]!.authorName, "SecurityBot");
    assert.strictEqual(byTask[1]!.authorName, "UxAuditor");

    const byPr = await discussionRepo.getCommentsByPrIndex(42);
    assert.strictEqual(byPr.length, 2);
  });

  test("should group comments into threads and resolve thread", async () => {
    const threadId = "thread-auth-guard-01";

    await discussionRepo.recordComment({
      taskId: "task-discuss-001",
      prIndex: 42,
      threadId,
      authorName: "SecurityBot",
      authorRole: "model:security",
      domainTag: "Authentication",
      filePath: "src/guards/auth.guard.ts",
      lineNumber: 22,
      bodyContent: "Consider handling missing authorization header with 401 instead of 500.",
      isResolved: false,
    });

    await discussionRepo.recordComment({
      taskId: "task-discuss-001",
      prIndex: 42,
      threadId,
      authorName: "qwen2.5-coder:7b",
      authorRole: "model:implementer",
      domainTag: "Authentication",
      filePath: "src/guards/auth.guard.ts",
      lineNumber: 22,
      bodyContent: "Agreed, updated guard to return 401 Unauthorized for empty header.",
      isResolved: false,
    });

    const threads = await discussionRepo.getThreadsByTaskId("task-discuss-001");
    const targetThread = threads.find((t) => t.threadId === threadId);
    assert.ok(targetThread);
    assert.strictEqual(targetThread.comments.length, 2);
    assert.strictEqual(targetThread.isResolved, false);

    const unresolvedCount = await discussionRepo.countUnresolvedBlockers("task-discuss-001");
    assert.strictEqual(unresolvedCount, 4);

    // Resolve thread
    await discussionRepo.resolveThread(threadId);

    const updatedThreads = await discussionRepo.getThreadsByTaskId("task-discuss-001");
    const resolvedTarget = updatedThreads.find((t) => t.threadId === threadId);
    assert.ok(resolvedTarget);
    assert.strictEqual(resolvedTarget.isResolved, true);

    const postResolveCount = await discussionRepo.countUnresolvedBlockers("task-discuss-001");
    assert.strictEqual(postResolveCount, 2);
  });
});
