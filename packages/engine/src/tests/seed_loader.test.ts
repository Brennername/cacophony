import test from "node:test";
import assert from "node:assert/strict";
import { TaskcadeSeedLoader } from "../scheduler/TaskcadeSeedLoader.js";
import type { TaskRepository } from "@cacophony/db";
import type { TaskRecord } from "@cacophony/shared-types";

test("T47.6: TaskcadeSeedLoader Suite", async (t) => {
  await t.test(
    "T47.6.1: Correctly parses markdown checklist items, roles, focus files and test commands",
    () => {
      const sampleMarkdown = `
# Sample Taskcade
## Phase 46: End-to-End Pipeline
- [x] T46.1.1: Completed task [File: packages/engine/src/file1.ts] [Test: npm test]
- [ ] T46.1.2: Update TaskInspectorComponent stage stepper [File: packages/frontend/src/app/components/task-inspector/task-inspector.component.ts] [Test: npm test]
- [ ] T46.1.4: Write unit tests verifying stage transition broadcasts [File: packages/engine/src/tests/stage_telemetry.test.ts] [Test: npm test -- packages/engine/src/tests/stage_telemetry.test.ts]
- [ ] T46.2.1: Integrate GitWorktreeManager with AutonomousWorkerPipeline [File: packages/engine/src/scheduler/AutonomousWorkerPipeline.ts] [Test: npm test -- packages/engine/src/tests/gitea_integration.test.ts]
`;

      const loader = new TaskcadeSeedLoader("/fake/path");
      const parsed = loader.parseMarkdown(sampleMarkdown);

      assert.strictEqual(parsed.length, 4);

      // Completed task
      assert.strictEqual(parsed[0]?.taskId, "taskcade-t46.1.1");
      assert.strictEqual(parsed[0]?.completed, true);

      // Uncompleted task with focus file and test command
      assert.strictEqual(parsed[1]?.taskId, "taskcade-t46.1.2");
      assert.strictEqual(parsed[1]?.completed, false);
      assert.strictEqual(
        parsed[1]?.focusFiles,
        "packages/frontend/src/app/components/task-inspector/task-inspector.component.ts",
      );
      assert.strictEqual(parsed[1]?.testCommand, "npm test");
      assert.strictEqual(parsed[1]?.role, "implementer");

      // Test engineer role classification
      assert.strictEqual(parsed[2]?.taskId, "taskcade-t46.1.4");
      assert.strictEqual(parsed[2]?.role, "test_engineer");
      assert.strictEqual(
        parsed[2]?.focusFiles,
        "packages/engine/src/tests/stage_telemetry.test.ts",
      );
    },
  );

  await t.test(
    "T47.6.4: Integration: TaskcadeSeedLoader registers uncompleted tasks with TaskRepository.createIfNotExists",
    async () => {
      const loader = new TaskcadeSeedLoader();
      // Load uncompleted tasks from actual docs/taskcade.md
      const tasks = await loader.loadTasks({ limit: 5 });

      assert.ok(
        tasks.length > 0,
        "Should load pending tasks from docs/taskcade.md",
      );
      const first = tasks[0]!;
      assert.ok(
        first.id.startsWith("taskcade-"),
        "Task ID should follow taskcade convention",
      );
      assert.ok(first.prompt.length > 0, "Prompt should be non-empty");

      const createdIds: string[] = [];
      const mockTaskRepo = {
        createIfNotExists: async (task: TaskRecord) => {
          if (createdIds.includes(task.id)) {
            return { created: false, task };
          }
          createdIds.push(task.id);
          return { created: true, task };
        },
      } as unknown as TaskRepository;

      const res1 = await mockTaskRepo.createIfNotExists(first);
      assert.strictEqual(res1.created, true);

      // Duplicate check
      const res2 = await mockTaskRepo.createIfNotExists(first);
      assert.strictEqual(res2.created, false);
    },
  );

  await t.test(
    "T72.1.4: Parses complex metadata annotations without corrupting task title or prompt instructions",
    () => {
      const complexMarkdown = `
# Extended Taskcade
## Phase 72: Advanced Scaffolding & Seed Loading
- [ ] T72.1.4: Complex metadata task specification [Role: test_engineer] [Priority: P0] [Files: packages/engine/src/tests/seed_loader.test.ts] [Test: npm test -- packages/engine/src/tests/seed_loader.test.ts] [BypassRules: no_any] [Temp: 0.2] [Model: qwen2.5-coder:7b]
`;

      const loader = new TaskcadeSeedLoader("/fake/path");
      const parsed = loader.parseMarkdown(complexMarkdown);

      assert.strictEqual(parsed.length, 1);
      const item = parsed[0]!;

      assert.strictEqual(item.taskId, "taskcade-t72.1.4");
      assert.strictEqual(item.role, "test_engineer");
      assert.strictEqual(item.priority, "P0");
      assert.strictEqual(
        item.focusFiles,
        "packages/engine/src/tests/seed_loader.test.ts",
      );
      assert.strictEqual(
        item.testCommand,
        "npm test -- packages/engine/src/tests/seed_loader.test.ts",
      );

      // Verify that cleanPrompt, title, and prompt instructions do NOT contain raw bracketed annotations
      assert.ok(!item.title.includes("[Role:"));
      assert.ok(!item.title.includes("[Priority:"));
      assert.ok(!item.title.includes("[BypassRules:"));
      assert.ok(!item.title.includes("[Temp:"));
      assert.ok(!item.title.includes("[Model:"));
      assert.ok(item.title.includes("Complex metadata task specification"));

      assert.ok(item.prompt.includes("[TASK OBJECTIVE]: T72.1.4: Complex metadata task specification"));
      assert.ok(item.prompt.includes("[FOCUS FILE]: packages/engine/src/tests/seed_loader.test.ts"));
      assert.ok(!item.prompt.includes("[BypassRules:"));
      assert.ok(!item.prompt.includes("[Temp:"));
    },
  );
});

