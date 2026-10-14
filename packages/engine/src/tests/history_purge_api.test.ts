import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CacophonyHttpServer } from "../daemon/CacophonyHttpServer.js";
import type { TaskRecord, TaskStatus } from "@cacophony/shared-types";

class MockHistoryTaskRepo {
  public tasks: TaskRecord[] = [
    {
      id: "task-completed-1",
      title: "Completed Task 1",
      prompt: "Do something",
      role: "architect",
      status: "COMPLETED",
      priority: "P1",
      failureCount: 0,
      modelAssigned: "qwen2.5-coder:7b",
      testCommand: null,
      focusFiles: null,
      targetBranch: null,
      prUrl: null,
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      completedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: "task-failed-1",
      title: "Failed Task 1",
      prompt: "Do something else",
      role: "implementer",
      status: "FAILED",
      priority: "P0",
      failureCount: 3,
      modelAssigned: "qwen2.5-coder:7b",
      testCommand: null,
      focusFiles: null,
      targetBranch: null,
      prUrl: null,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      completedAt: null,
    },
    {
      id: "task-pending-1",
      title: "Pending Task 1",
      prompt: "Active work in queue",
      role: "implementer",
      status: "PENDING",
      priority: "P1",
      failureCount: 0,
      modelAssigned: null,
      testCommand: null,
      focusFiles: null,
      targetBranch: null,
      prUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    },
    {
      id: "task-running-1",
      title: "Running Task 1",
      prompt: "Active work executing",
      role: "test_engineer",
      status: "RUNNING",
      priority: "P0",
      failureCount: 0,
      modelAssigned: "qwen2.5-coder:7b",
      testCommand: null,
      focusFiles: null,
      targetBranch: null,
      prUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    },
  ];

  public async purgeHistoricalTasks(options?: {
    olderThanDays?: number | undefined;
    status?: TaskStatus[] | undefined;
  }): Promise<{ purgedCount: number }> {
    const allowed = options?.status && options.status.length > 0
      ? options.status.filter((s) => s !== "PENDING" && s !== "RUNNING")
      : ["COMPLETED", "FAILED", "CANCELLED"];

    const beforeCount = this.tasks.length;
    this.tasks = this.tasks.filter((t) => {
      if (!allowed.includes(t.status)) return true;
      if (options?.olderThanDays) {
        const cutoff = Date.now() - options.olderThanDays * 86400000;
        return new Date(t.updatedAt).getTime() >= cutoff;
      }
      return false;
    });

    return { purgedCount: beforeCount - this.tasks.length };
  }

  public async listRecent() {
    return this.tasks;
  }
}

describe("DELETE /api/history Integration Suite (T66.2)", () => {
  let server: CacophonyHttpServer | null = null;
  const port = 29983;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  test("purges COMPLETED and FAILED tasks while strictly preserving PENDING and RUNNING tasks", async () => {
    const mockRepo = new MockHistoryTaskRepo();
    const mockDaemon: any = {
      getTaskRepository: () => mockRepo,
      getModelHealthRepository: () => ({ listProfiles: async () => [] }),
      getUserSessionRepository: () => null,
      getMetricsService: () => null,
      getScheduler: () => null,
      getTelemetryService: () => null,
      getStreamTapManager: () => null,
      getEventBus: () => ({ on: () => {}, off: () => {} }),
    };

    server = new CacophonyHttpServer(mockDaemon, { httpPort: port, httpHost: "127.0.0.1" });
    await server.start();

    const deleteRes = await fetch(`http://127.0.0.1:${port}/api/history`, {
      method: "DELETE",
    });
    assert.strictEqual(deleteRes.status, 200);

    const body = (await deleteRes.json()) as { success: boolean; purgedCount: number };
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.purgedCount, 2);

    // Verify remaining tasks in repo
    const remaining = mockRepo.tasks;
    assert.strictEqual(remaining.length, 2);
    assert.ok(remaining.some((t) => t.id === "task-pending-1" && t.status === "PENDING"));
    assert.ok(remaining.some((t) => t.id === "task-running-1" && t.status === "RUNNING"));
    assert.ok(!remaining.some((t) => t.id === "task-completed-1"));
    assert.ok(!remaining.some((t) => t.id === "task-failed-1"));
  });

  test("supports olderThanDays query filter to prune only old tasks", async () => {
    const mockRepo = new MockHistoryTaskRepo();
    const mockDaemon: any = {
      getTaskRepository: () => mockRepo,
      getModelHealthRepository: () => ({ listProfiles: async () => [] }),
      getUserSessionRepository: () => null,
      getMetricsService: () => null,
      getScheduler: () => null,
      getTelemetryService: () => null,
      getStreamTapManager: () => null,
      getEventBus: () => ({ on: () => {}, off: () => {} }),
    };

    server = new CacophonyHttpServer(mockDaemon, { httpPort: port, httpHost: "127.0.0.1" });
    await server.start();

    // Only purge tasks older than 7 days (task-completed-1 is 10 days old, task-failed-1 is 5 days old)
    const deleteRes = await fetch(`http://127.0.0.1:${port}/api/history?olderThanDays=7`, {
      method: "DELETE",
    });
    assert.strictEqual(deleteRes.status, 200);

    const body = (await deleteRes.json()) as { success: boolean; purgedCount: number };
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.purgedCount, 1);

    // task-failed-1 should remain because it's only 5 days old
    assert.ok(mockRepo.tasks.some((t) => t.id === "task-failed-1"));
    assert.ok(!mockRepo.tasks.some((t) => t.id === "task-completed-1"));
  });
});
