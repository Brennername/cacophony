import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDriver } from "../drivers/SQLiteDriver.js";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { TaskRepository } from "../repositories/TaskRepository.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("T64.3.4: TaskRepository updateBranchAndPr & CRUD Suite", () => {
  describe("SQLiteDriver In-Memory", () => {
    let driver: SQLiteDriver;
    let taskRepo: TaskRepository;

    before(async () => {
      driver = new SQLiteDriver(":memory:");
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();
      taskRepo = new TaskRepository(driver);
    });

    after(async () => {
      await driver.close();
    });

    test("should create task and update branch and PR metadata (T64.3.4)", async () => {
      const task: TaskRecord = {
        id: "task-branch-sqlite",
        title: "Test Task for Branch and PR Update",
        prompt: "Verify updateBranchAndPr updates fields correctly",
        role: "implementer",
        status: "RUNNING",
        priority: "P1",
        modelAssigned: "qwen2.5-coder:7b",
        testCommand: "npm test",
        focusFiles: "packages/db/src/index.ts",
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };

      await taskRepo.create(task);

      // Verify created task
      const initial = await taskRepo.findById("task-branch-sqlite");
      assert.ok(initial, "Created task must exist");
      assert.strictEqual(initial?.targetBranch, null);
      assert.strictEqual(initial?.prUrl, null);

      // Update branch and PR (T64.3.4)
      await taskRepo.updateBranchAndPr(
        "task-branch-sqlite",
        "task/p1-task-branch-sqlite",
        "http://localhost:19634/NeXeN/cacophony/pulls/88",
      );

      const updated = await taskRepo.findById("task-branch-sqlite");
      assert.strictEqual(
        updated?.targetBranch,
        "task/p1-task-branch-sqlite",
        "Branch must be updated in database",
      );
      assert.strictEqual(
        updated?.prUrl,
        "http://localhost:19634/NeXeN/cacophony/pulls/88",
        "PR URL must be updated in database",
      );
    });
  });

  describe("PGliteDriver In-Memory", () => {
    let driver: PGliteDriver;
    let taskRepo: TaskRepository;

    before(async () => {
      driver = new PGliteDriver("memory://");
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();
      taskRepo = new TaskRepository(driver);
    });

    after(async () => {
      await driver.close();
    });

    test("should create task and update branch and PR metadata on PGlite (T64.3.4)", async () => {
      const task: TaskRecord = {
        id: "task-branch-pglite",
        title: "Test Task for PGlite Branch and PR Update",
        prompt: "Verify updateBranchAndPr updates fields correctly on PGlite",
        role: "implementer",
        status: "RUNNING",
        priority: "P0",
        modelAssigned: "qwen2.5-coder:7b",
        testCommand: "npm test",
        focusFiles: "packages/db/src/index.ts",
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };

      await taskRepo.create(task);

      // Update branch and PR (T64.3.4)
      await taskRepo.updateBranchAndPr(
        "task-branch-pglite",
        "task/p0-task-branch-pglite",
        "http://localhost:19634/NeXeN/cacophony/pulls/99",
      );

      const updated = await taskRepo.findById("task-branch-pglite");
      assert.strictEqual(
        updated?.targetBranch,
        "task/p0-task-branch-pglite",
        "Branch must be updated on PGlite",
      );
      assert.strictEqual(
        updated?.prUrl,
        "http://localhost:19634/NeXeN/cacophony/pulls/99",
        "PR URL must be updated on PGlite",
      );
    });

    test("T72.1.3: should persist and deserialize metadataHints structured JSON (SQLite & PGlite)", async () => {
      const taskWithHints: TaskRecord = {
        id: "task-hints-pglite",
        title: "Test Task with Granular Metadata Hints",
        prompt: "Verify metadataHints are persisted and parsed accurately",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: "qwen2.5-coder:7b",
        testCommand: "npm test",
        focusFiles: "packages/db/src/repositories/TaskRepository.ts",
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        metadataHints: {
          modelAffinity: "qwen2.5-coder:7b-instruct-q4_K_M",
          temperature: 0.2,
          maxTokens: 4096,
          timeoutMs: 30000,
          ruleBypassFlags: ["emoji_scrubber", "no_any"],
          stack: "node",
          customDirectives: {
            cachePolicy: "aggressive",
          },
        },
      };

      await taskRepo.create(taskWithHints);
      const retrieved = await taskRepo.findById("task-hints-pglite");
      assert.ok(retrieved, "Task with metadata hints must exist");
      assert.ok(retrieved?.metadataHints, "metadataHints must not be null");
      assert.strictEqual(
        retrieved?.metadataHints?.modelAffinity,
        "qwen2.5-coder:7b-instruct-q4_K_M",
      );
      assert.strictEqual(retrieved?.metadataHints?.temperature, 0.2);
      assert.strictEqual(retrieved?.metadataHints?.maxTokens, 4096);
      assert.strictEqual(retrieved?.metadataHints?.timeoutMs, 30000);
      assert.deepStrictEqual(retrieved?.metadataHints?.ruleBypassFlags, [
        "emoji_scrubber",
        "no_any",
      ]);
      assert.strictEqual(retrieved?.metadataHints?.stack, "node");
      assert.strictEqual(
        retrieved?.metadataHints?.customDirectives?.["cachePolicy"],
        "aggressive",
      );
    });
  });
});

