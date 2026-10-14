import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDriver } from "../drivers/SQLiteDriver.js";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { TaskRepository } from "../repositories/TaskRepository.js";
import { PrReviewRepository } from "../repositories/PrReviewRepository.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("T64.5.3: PrReviewRepository Database Persistence", () => {
  describe("SQLiteDriver In-Memory", () => {
    let driver: SQLiteDriver;
    let taskRepo: TaskRepository;
    let reviewRepo: PrReviewRepository;

    before(async () => {
      driver = new SQLiteDriver(":memory:");
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();

      taskRepo = new TaskRepository(driver);
      reviewRepo = new PrReviewRepository(driver);

      // Seed parent task
      const task: TaskRecord = {
        id: "task-pr-001",
        title: "Test PR review task",
        prompt: "Implement PR review persistence",
        role: "implementer",
        status: "RUNNING",
        priority: "P1",
        modelAssigned: "deepseek-r1:8b",
        testCommand: "npm test",
        focusFiles: "src/review.ts",
        targetBranch: "task/p1-task-pr-001",
        prUrl: "http://localhost:19634/NeXeN/cacophony/pulls/10",
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

    test("should record, retrieve by ID, and query by task ID", async () => {
      const created = await reviewRepo.recordReview({
        taskId: "task-pr-001",
        giteaPrId: 10,
        reviewerModel: "deepseek-r1:8b",
        verdict: "APPROVE",
        reviewNotes:
          "Code adheres to SOLID principles and zero-emoji compliance.",
        diffAnalyzed:
          "--- a/src/review.ts\n+++ b/src/review.ts\n@@ -1 +1,2 @@\n+// Clean code",
      });

      assert.ok(created.id > 0, "Review record must have auto-incremented ID");
      assert.strictEqual(created.taskId, "task-pr-001");
      assert.strictEqual(created.verdict, "APPROVE");
      assert.strictEqual(created.giteaPrId, 10);

      // Get by ID
      const retrieved = await reviewRepo.getReviewById(created.id);
      assert.ok(retrieved);
      assert.strictEqual(retrieved?.id, created.id);
      assert.strictEqual(retrieved?.verdict, "APPROVE");
      assert.strictEqual(
        retrieved?.reviewNotes,
        "Code adheres to SOLID principles and zero-emoji compliance.",
      );

      // Get by Task ID
      const byTask = await reviewRepo.getReviewsByTaskId("task-pr-001");
      assert.strictEqual(byTask.length, 1);
      assert.strictEqual(byTask[0]?.id, created.id);

      // Get latest for PR
      const latest = await reviewRepo.getLatestReviewForPr(10);
      assert.ok(latest);
      assert.strictEqual(latest?.id, created.id);
    });
  });

  describe("PGliteDriver In-Memory", () => {
    let driver: PGliteDriver;
    let taskRepo: TaskRepository;
    let reviewRepo: PrReviewRepository;

    before(async () => {
      driver = new PGliteDriver();
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();

      taskRepo = new TaskRepository(driver);
      reviewRepo = new PrReviewRepository(driver);

      // Seed parent task
      const task: TaskRecord = {
        id: "task-pr-pg-001",
        title: "Test PR review pg task",
        prompt: "Implement PR review persistence on postgres",
        role: "implementer",
        status: "RUNNING",
        priority: "P1",
        modelAssigned: "deepseek-r1:8b",
        testCommand: "npm test",
        focusFiles: "src/review.ts",
        targetBranch: "task/p1-task-pr-pg-001",
        prUrl: "http://localhost:19634/NeXeN/cacophony/pulls/11",
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

    test("should record review with RETURNING id on PGlite", async () => {
      const created = await reviewRepo.recordReview({
        taskId: "task-pr-pg-001",
        giteaPrId: 11,
        reviewerModel: "deepseek-r1:8b",
        verdict: "REQUEST_CHANGES",
        reviewNotes: "Security risk detected in query parameters.",
        diffAnalyzed: "--- a/src/query.ts\n+++ b/src/query.ts",
      });

      assert.ok(created.id > 0);
      assert.strictEqual(created.taskId, "task-pr-pg-001");
      assert.strictEqual(created.verdict, "REQUEST_CHANGES");

      const byId = await reviewRepo.getReviewById(created.id);
      assert.ok(byId);
      assert.strictEqual(byId?.verdict, "REQUEST_CHANGES");
    });
  });
});
