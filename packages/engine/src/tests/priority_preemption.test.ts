import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { ModelAffinityTaskSorter } from "../scheduler/ModelAffinityTaskSorter.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("Priority Preemption & Starvation Prevention Test Suite (T47.5.4)", () => {
  const createMockTask = (id: string, priority: "P0" | "P1" | "P2", ageMinutes = 0, model = "model-a"): TaskRecord => {
    const created = new Date(Date.now() - ageMinutes * 60 * 1000).toISOString();
    return {
      id,
      title: `Task ${id}`,
      priority,
      status: "PENDING",
      role: "planner",
      prompt: `Prompt ${id}`,
      modelAssigned: model,
      createdAt: created,
      updatedAt: created,
      failureCount: 0,
      testCommand: null,
      focusFiles: null,
      prUrl: null,
      targetBranch: null,
      completedAt: null
    };
  };

  test("P0 tasks preempt lower-priority (P1, P2) tasks even if P1 matches loaded model", () => {
    const sorter = new ModelAffinityTaskSorter(3600);
    const p1 = createMockTask("p1_task", "P1", 5, "model-loaded");
    const p2 = createMockTask("p2_task", "P2", 10, "model-other");
    const p0 = createMockTask("p0_task", "P0", 1, "model-other");

    const sorted = sorter.sort([p2, p1, p0], "model-loaded");
    assert.equal(sorted[0]?.id, "p0_task", "P0 task must preempt P1 and P2");
    assert.equal(sorted[1]?.id, "p1_task", "P1 with affinity follows P0");
    assert.equal(sorted[2]?.id, "p2_task", "P2 follows P1");
  });

  test("Starvation prevention auto-escalates aging P2 tasks ahead of newer P1 tasks", () => {
    // Sorter with 15-minute starvation threshold (900 seconds)
    const sorter = new ModelAffinityTaskSorter(900);

    const oldP2 = createMockTask("old_p2", "P2", 20); // 20 minutes old > 15m threshold
    const newP1 = createMockTask("new_p1", "P1", 2); // 2 minutes old

    const sorted = sorter.sort([newP1, oldP2], null);
    assert.equal(sorted[0]?.id, "old_p2", "Starving P2 task should auto-escalate ahead of recent P1");
    assert.equal(sorted[1]?.id, "new_p1");
  });

  test("Multiple P0 tasks maintain FIFO ordering based on creation timestamp", () => {
    const sorter = new ModelAffinityTaskSorter(3600);
    const p0Older = createMockTask("p0_older", "P0", 30);
    const p0Newer = createMockTask("p0_newer", "P0", 5);

    const sorted = sorter.sort([p0Newer, p0Older], null);
    assert.equal(sorted[0]?.id, "p0_older", "Older P0 must execute before newer P0");
    assert.equal(sorted[1]?.id, "p0_newer");
  });
});