import test from "node:test";
import assert from "node:assert/strict";
import { AutoLoopSupervisor } from "../daemon/AutoLoopSupervisor.js";
import type { TaskRecord } from "@cacophony/shared-types";

test("AutoLoopSupervisor Suite (T84.1)", async (t) => {
  await t.test("should handle worker error, record failure, and survive crash", async () => {
    let statusUpdated: { id: string; status: string } | null = null;
    const mockRepo = {
      listPending: async () => [],
      createIfNotExists: async (task: TaskRecord) => ({ created: true, task }),
      updateStatus: async (id: string, status: any) => {
        statusUpdated = { id, status };
      }
    };

    const supervisor = new AutoLoopSupervisor(mockRepo, { pollIntervalMs: 50 });
    supervisor.start();

    const testError = new Error("Simulated Ollama socket crash");
    await supervisor.handleWorkerError("task-crash-1", testError);

    const state = supervisor.getState();
    assert.strictEqual(state.totalErrorsHandled, 1);
    assert.strictEqual(state.consecutiveCrashes, 1);
    assert.ok(state.lastErrorTimestamp !== undefined);
    assert.deepStrictEqual(statusUpdated, { id: "task-crash-1", status: "FAILED" });

    supervisor.stop();
  });

  await t.test("should generate vacancy task when pending queue is empty", async () => {
    let createdVacancy: TaskRecord | null = null;
    const mockRepo = {
      listPending: async () => [],
      createIfNotExists: async (task: TaskRecord) => {
        createdVacancy = task;
        return { created: true, task };
      },
      updateStatus: async () => {}
    };

    const supervisor = new AutoLoopSupervisor(mockRepo, { vacancyFillEnabled: true });
    const task = await supervisor.fillVacancy();

    assert.ok(task !== null);
    assert.ok(task.id.startsWith("vacancy-"));
    assert.strictEqual(task.status, "PENDING");
    assert.strictEqual((createdVacancy as TaskRecord | null)?.id, task.id);
  });
});
