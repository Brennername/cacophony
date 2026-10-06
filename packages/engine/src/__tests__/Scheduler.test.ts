import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { ExecutionMutex } from "../scheduler/ExecutionMutex.js";
import { ModelAffinityTaskSorter } from "../scheduler/ModelAffinityTaskSorter.js";
import { ModelEvictionManager } from "../scheduler/ModelEvictionManager.js";
import { QueueGroomer } from "../scheduler/QueueGroomer.js";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import { PGliteDriver, TaskRepository, StageRepository, ModelHealthRepository, MigrationRunner } from "@cacophony/db";
import { FallbackTelemetryProvider } from "../telemetry/FallbackTelemetryProvider.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("Single-Concurrency Scheduler & Model Governor", () => {
  describe("ExecutionMutex", () => {
    test("should enforce mutual exclusion across async callers", async () => {
      const mutex = new ExecutionMutex();
      assert.equal(mutex.isLocked(), false);

      const release1 = await mutex.acquire();
      assert.equal(mutex.isLocked(), true);

      let caller2Entered = false;
      const caller2Promise = mutex.acquire().then((release2) => {
        caller2Entered = true;
        return release2;
      });

      assert.equal(caller2Entered, false);
      assert.equal(mutex.getWaitingCount(), 1);

      release1();
      const release2 = await caller2Promise;
      assert.equal(caller2Entered, true);
      assert.equal(mutex.isLocked(), true);

      release2();
      assert.equal(mutex.isLocked(), false);
    });
  });

  describe("ModelAffinityTaskSorter", () => {
    const sorter = new ModelAffinityTaskSorter(3600);

    const makeTask = (id: string, priority: "P0" | "P1" | "P2", model: string | null, ageMs: number): TaskRecord => ({
      id,
      title: id,
      prompt: "test",
      role: "implementer",
      status: "PENDING",
      priority,
      modelAssigned: model,
      testCommand: null,
      focusFiles: null,
      targetBranch: null,
      prUrl: null,
      failureCount: 0,
      createdAt: new Date(Date.now() - ageMs).toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    });

    test("should prioritize task matching currently active VRAM model", () => {
      const activeModel = "qwen2.5-coder:7b";
      const t1 = makeTask("task-other", "P1", "deepseek-r1:8b", 5000);
      const t2 = makeTask("task-affinity", "P1", "qwen2.5-coder:7b", 2000);

      const sorted = sorter.sort([t1, t2], activeModel);
      assert.equal(sorted[0]?.id, "task-affinity");
    });

    test("should respect P0 priority over model affinity", () => {
      const activeModel = "qwen2.5-coder:7b";
      const tAffinity = makeTask("task-affinity", "P1", "qwen2.5-coder:7b", 1000);
      const tEmergency = makeTask("task-emergency", "P0", "deepseek-r1:8b", 1000);

      const sorted = sorter.sort([tAffinity, tEmergency], activeModel);
      assert.equal(sorted[0]?.id, "task-emergency");
    });

    test("should auto-escalate aging tasks to prevent starvation", () => {
      // 4000 seconds old (> 3600 max wait)
      const tStarved = makeTask("task-starved", "P2", "deepseek-r1:8b", 4000 * 1000);
      const tNewP1 = makeTask("task-new-p1", "P1", "qwen2.5-coder:7b", 500 * 1000);

      const sorted = sorter.sort([tNewP1, tStarved], "qwen2.5-coder:7b");
      assert.equal(sorted[0]?.id, "task-starved");
    });
  });

  describe("ModelEvictionManager", () => {
    let driver: PGliteDriver;
    let healthRepo: ModelHealthRepository;
    let evictionManager: ModelEvictionManager;

    before(async () => {
      driver = new PGliteDriver();
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();

      healthRepo = new ModelHealthRepository(driver);
      evictionManager = new ModelEvictionManager(healthRepo, 3, 0);
    });

    after(async () => {
      await driver.close();
    });

    test("should select loaded model when active and among candidates with zero exploration", async () => {
      const selected = await evictionManager.selectModel(
        "implementer",
        ["qwen2.5-coder:7b", "gemma3:4b"],
        "qwen2.5-coder:7b"
      );
      assert.equal(selected, "qwen2.5-coder:7b");
    });

    test("should support multi-model exploration when explorationRate is enabled", async () => {
      const exploratoryManager = new ModelEvictionManager(healthRepo, 3, 1.0);
      const selected = await exploratoryManager.selectModel(
        "implementer",
        ["qwen2.5-coder:7b", "gemma3:4b"],
        "qwen2.5-coder:7b"
      );
      assert.ok(["qwen2.5-coder:7b", "gemma3:4b"].includes(selected));
    });

    test("should exclude evicted model and select alternate candidate", async () => {
      const failingModel = "failing-model:7b";
      // Record 3 consecutive failures to trigger eviction
      await healthRepo.recordRun(failingModel, "ollama", false, 1000, 10);
      await healthRepo.recordRun(failingModel, "ollama", false, 1000, 10);
      await healthRepo.recordRun(failingModel, "ollama", false, 1000, 10);

      const profile = await healthRepo.getProfile(failingModel);
      assert.equal(profile.status, "EJECTED");

      const selected = await evictionManager.selectModel(
        "implementer",
        [failingModel, "healthy-model:7b"],
        null
      );
      assert.equal(selected, "healthy-model:7b");
    });
  });

  describe("QueueGroomer", () => {
    const groomer = new QueueGroomer();

    test("should scope test command based on package focus files", () => {
      const task: TaskRecord = {
        id: "task-groom-1",
        title: "Fix db issue",
        prompt: "Fix query in packages/db/src/index.ts",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: null,
        testCommand: "npm test",
        focusFiles: "packages/db/src/index.ts",
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      const groomed = groomer.groom(task);
      assert.equal(groomed.scopedTestCommand, "npm test --workspace=@cacophony/db --if-present");
      assert.ok(groomed.enrichedPrompt.includes("[ARCHITECTURAL DIRECTIVES]"));
    });

    test("should adapt directives when allowedImports are specified for a feature", () => {
      const task: TaskRecord = {
        id: "task-groom-redis",
        title: "Implement Redis Cache",
        prompt: "Build redis cache store",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: null,
        testCommand: null,
        focusFiles: null,
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      const groomed = groomer.groom(task, { allowedImports: ["redis"] });
      assert.ok(groomed.enrichedPrompt.includes("Approved Libraries: Feature is authorized to import: redis"));
      assert.ok(groomed.enrichedPrompt.includes("Zero Emojis: Strictly NO emojis"));
      assert.ok(groomed.groomNotes.some((n) => n.includes("Injected approved library directives: redis")));

    });

    test("should adapt directives when allowEmojis is specified for a feature", () => {
      const task: TaskRecord = {
        id: "task-groom-emoji",
        title: "Implement Emoji Reactions",
        prompt: "Build emoji reaction picker",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: null,
        testCommand: null,
        focusFiles: null,
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      const groomed = groomer.groom(task, { allowEmojis: true });
      assert.ok(groomed.enrichedPrompt.includes("Feature Exemption: Emojis permitted"));
      assert.ok(!groomed.enrichedPrompt.includes("Zero Emojis: Strictly NO emojis"));
    });

    test("should scope explicit test file commands and strip quotes from focus files", () => {
      const task: TaskRecord = {
        id: "task-groom-worktree",
        title: "T50.1.1: Worktree test",
        prompt: "Implement worktree allocation",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: null,
        testCommand: "npm test -- packages/engine/src/tests/gitea_integration.test.ts",
        focusFiles: '"packages/engine/src/gitea/GitWorktreeManager.ts"',
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      const groomed = groomer.groom(task);
      assert.equal(groomed.focusFiles[0], "packages/engine/src/gitea/GitWorktreeManager.ts");
      assert.equal(groomed.scopedTestCommand, "node --test packages/engine/dist/tests/gitea_integration.test.js");
      assert.ok(groomed.enrichedPrompt.includes("Integrity Rule: Always work and test with genuine integrity"));
      assert.ok(groomed.enrichedPrompt.includes("Module Imports: Import only from valid installed workspace packages"));
    });

    test("should fall back to the package test suite when the requested test file does not exist yet", () => {
      const task: TaskRecord = {
        id: "task-groom-missing-test",
        title: "T50.1.2: Missing test suite",
        prompt: "Implement worktree allocation",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: null,
        testCommand: "npm test -- packages/engine/src/tests/non_existent_future.test.ts",
        focusFiles: "packages/engine/src/gitea/GitWorktreeManager.ts",
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      const groomed = groomer.groom(task);
      assert.equal(groomed.scopedTestCommand, "npm run test --workspace=@cacophony/engine");
      assert.deepEqual(groomed.preflightIssues, []);
    });

    test("should clear test command for non-executable markdown files when test suite does not exist", () => {
      const task: TaskRecord = {
        id: "task-groom-md",
        title: "T50.1.3: Architecture documentation",
        prompt: "Update architecture doc",
        role: "doc_writer",
        status: "PENDING",
        priority: "P2",
        modelAssigned: null,
        testCommand: "npm test -- packages/engine/src/tests/non_existent_doc.test.ts",
        focusFiles: "docs/architecture/overview.md",
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      const groomed = groomer.groom(task);
      assert.equal(groomed.scopedTestCommand, "");
    });

    test("should scope frontend focus file to the frontend test suite", () => {
      const task: TaskRecord = {
        id: "task-groom-frontend",
        title: "T50.1.4: Frontend component",
        prompt: "Update dashboard component",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: null,
        testCommand: "npm test",
        focusFiles: "packages/frontend/src/app/dashboard.component.ts",
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      const groomed = groomer.groom(task);
      assert.equal(groomed.scopedTestCommand, "npm run test --workspace=@cacophony/frontend");
    });
  });


  describe("TaskScheduler Execution Cycle", () => {
    let driver: PGliteDriver;
    let taskRepo: TaskRepository;
    let stageRepo: StageRepository;
    let healthRepo: ModelHealthRepository;
    let scheduler: TaskScheduler;

    before(async () => {
      driver = new PGliteDriver();
      await driver.connect();
      const runner = new MigrationRunner(driver);
      await runner.migrate();

      taskRepo = new TaskRepository(driver);
      stageRepo = new StageRepository(driver);
      healthRepo = new ModelHealthRepository(driver);
      const evictionManager = new ModelEvictionManager(healthRepo);
      const telemetryProvider = new FallbackTelemetryProvider(true);

      scheduler = new TaskScheduler({
        taskRepo,
        stageRepo,
        evictionManager,
        telemetryProvider
      });
    });

    after(async () => {
      scheduler.stop();
      await driver.close();
    });

    test("should execute tick and complete pending task", async () => {
      const task: TaskRecord = {
        id: "task-sched-01",
        title: "Implement auth token",
        prompt: "Write token generator",
        role: "implementer",
        status: "PENDING",
        priority: "P0",
        modelAssigned: "qwen2.5-coder:7b",
        testCommand: "npm test",
        focusFiles: "",
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      await taskRepo.create(task);

      let executed = false;
      scheduler.setExecutionHandler(async (groomedTask, selectedModel) => {
        assert.equal(groomedTask.task.id, "task-sched-01");
        assert.equal(selectedModel, "qwen2.5-coder:7b");
        executed = true;
        return { success: true, tokensPerSec: 28.5 }; // Success
      });

      scheduler.start(5000);
      const processed = await scheduler.tick();
      assert.ok(processed);
      assert.equal(executed, true);

      const finalTask = await taskRepo.getById("task-sched-01");
      assert.equal(finalTask?.status, "COMPLETED");
    });
  });
});
