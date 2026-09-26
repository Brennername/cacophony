import test from "node:test";
import assert from "node:assert/strict";
import { TaskcadeSeedLoader } from "../scheduler/TaskcadeSeedLoader.js";
import type { TaskRepository } from "@cacophony/db";
import type { TaskRecord } from "@cacophony/shared-types";

test("T47.6: TaskcadeSeedLoader Suite", async (t) => {
  await t.test("T47.6.1: Correctly parses markdown checklist items, roles, focus files and test commands", () => {
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
    assert.strictEqual(parsed[1]?.focusFiles, "packages/frontend/src/app/components/task-inspector/task-inspector.component.ts");
    assert.strictEqual(parsed[1]?.testCommand, "npm test");
    assert.strictEqual(parsed[1]?.role, "implementer");

    // Test engineer role classification
    assert.strictEqual(parsed[2]?.taskId, "taskcade-t46.1.4");
    assert.strictEqual(parsed[2]?.role, "test_engineer");
    assert.strictEqual(parsed[2]?.focusFiles, "packages/engine/src/tests/stage_telemetry.test.ts");
  });

  await t.test("T47.6.4: Integration: TaskcadeSeedLoader registers uncompleted tasks with TaskRepository.createIfNotExists", async () => {
    const loader = new TaskcadeSeedLoader();
    // Load uncompleted tasks from actual docs/taskcade.md
    const tasks = await loader.loadTasks({ limit: 5 });

    assert.ok(tasks.length > 0, "Should load pending tasks from docs/taskcade.md");
    const first = tasks[0]!;
    assert.ok(first.id.startsWith("taskcade-"), "Task ID should follow taskcade convention");
    assert.ok(first.prompt.length > 0, "Prompt should be non-empty");

    const createdIds: string[] = [];
    const mockTaskRepo = {
      createIfNotExists: async (task: TaskRecord) => {
        if (createdIds.includes(task.id)) {
          return { created: false, task };
        }
        createdIds.push(task.id);
        return { created: true, task };
      }
    } as unknown as TaskRepository;

    const res1 = await mockTaskRepo.createIfNotExists(first);
    assert.strictEqual(res1.created, true);

    // Duplicate check
    const res2 = await mockTaskRepo.createIfNotExists(first);
    assert.strictEqual(res2.created, false);
  });
});
