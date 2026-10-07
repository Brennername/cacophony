import test from "node:test";
import assert from "node:assert/strict";
import { BatchedStageScheduler } from "../scheduler/BatchedStageScheduler.js";
import type { TaskRecord } from "@cacophony/shared-types";

function createMockTask(id: string, priority: "P0" | "P1" | "P2", model: string | null = null): TaskRecord {
  const now = new Date().toISOString();
  return {
    id,
    title: `Task ${id}`,
    prompt: "Prompt",
    role: "implementer",
    status: "PENDING",
    priority,
    modelAssigned: model,
    testCommand: null,
    focusFiles: null,
    targetBranch: null,
    prUrl: null,
    failureCount: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

test("BatchedStageScheduler Suite (T92.2.1)", async (t) => {
  await t.test("should batch-dispatch up to 5 tasks matching resident VRAM model", () => {
    const scheduler = new BatchedStageScheduler({ maxBatchWindow: 5 });

    const tasks: TaskRecord[] = [
      createMockTask("t1", "P1", "qwen2.5-coder:14b"),
      createMockTask("t2", "P1", "deepseek-r1:8b"),
      createMockTask("t3", "P1", "qwen2.5-coder:14b"),
      createMockTask("t4", "P1", "qwen2.5-coder:14b"),
      createMockTask("t5", "P1", "qwen2.5-coder:14b"),
      createMockTask("t6", "P1", "qwen2.5-coder:14b"),
    ];

    // First pick with resident model 'qwen2.5-coder:14b'
    const d1 = scheduler.selectNextTask(tasks, "qwen2.5-coder:14b");
    assert.strictEqual(d1?.task.id, "t1");
    assert.strictEqual(d1?.isBatchedAffinity, true);
    assert.strictEqual(d1?.batchIndex, 1);

    // Remaining tasks: t2 (deepseek), t3, t4, t5, t6 (qwen)
    const remaining1 = tasks.filter((t) => t.id !== "t1");
    const d2 = scheduler.selectNextTask(remaining1, "qwen2.5-coder:14b");
    assert.strictEqual(d2?.task.id, "t3", "Should pick t3 due to VRAM affinity, skipping t2");
    assert.strictEqual(d2?.isBatchedAffinity, true);
    assert.strictEqual(d2?.batchIndex, 2);
  });

  await t.test("P0 emergency task immediately preempts VRAM affinity batch", () => {
    const scheduler = new BatchedStageScheduler({ maxBatchWindow: 5 });

    const tasks: TaskRecord[] = [
      createMockTask("p0-urgent", "P0", "smollm2:135m"),
      createMockTask("t1", "P1", "qwen2.5-coder:14b"),
    ];

    const decision = scheduler.selectNextTask(tasks, "qwen2.5-coder:14b");
    assert.strictEqual(decision?.task.id, "p0-urgent");
    assert.ok(decision?.reason.includes("Preempted by critical P0 task"));
  });
});
