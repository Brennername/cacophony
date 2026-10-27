import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BoutiqueBatchOrchestrator,
  type BoutiqueTask,
} from "../scheduler/BoutiqueBatchOrchestrator.js";
import { CacophonyHttpServer } from "../daemon/CacophonyHttpServer.js";
import type { ModelRosterEntry, UpsertModelRosterInput } from "@cacophony/shared-types";

class MockModelRosterRepository {
  public entries: Map<string, ModelRosterEntry> = new Map();

  public async upsert(input: UpsertModelRosterInput): Promise<ModelRosterEntry> {
    const entry: ModelRosterEntry = {
      id: `id-${input.modelId}`,
      modelId: input.modelId,
      tier: input.tier ?? "BOUTIQUE",
      roles: input.roles ?? ["architect"],
      concurrencyLimit: 1,
      isActive: input.isActive ?? true,
      isProtected: input.isProtected ?? false,
      evalTaskCount: 0,
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.entries.set(input.modelId, entry);
    return entry;
  }
}

describe("BoutiqueBatchOrchestrator Suite (T-S5.4)", () => {
  it("enqueues boutique tasks and stages them in pending queue", async () => {
    const rosterRepo = new MockModelRosterRepository();
    const orchestrator = new BoutiqueBatchOrchestrator({
      rosterRepo: rosterRepo as any,
      batchSizeThreshold: 3,
    });

    const task1 = await orchestrator.enqueueTask({
      title: "Full Repository Architecture Audit",
      targetModel: "command-r-plus:104b-q4_K_M",
    });

    assert.equal(task1.title, "Full Repository Architecture Audit");
    assert.equal(task1.targetModel, "command-r-plus:104b-q4_K_M");
    assert.equal(task1.status, "QUEUED");

    const queue = orchestrator.getPendingQueue("command-r-plus:104b-q4_K_M");
    assert.equal(queue.length, 1);
    assert.equal(queue[0]!.id, task1.id);

    // Verify DB entry updated to BOUTIQUE tier
    const dbRecord = rosterRepo.entries.get("command-r-plus:104b-q4_K_M");
    assert.equal(dbRecord?.tier, "BOUTIQUE");
  });

  it("evaluates shouldTriggerBatch based on batch size threshold and milestone tags", async () => {
    const orchestrator = new BoutiqueBatchOrchestrator({
      batchSizeThreshold: 3,
    });

    assert.equal(orchestrator.shouldTriggerBatch("model-x"), false);

    await orchestrator.enqueueTask({
      title: "Task 1",
      targetModel: "model-x",
    });
    assert.equal(orchestrator.shouldTriggerBatch("model-x"), false);

    await orchestrator.enqueueTask({
      title: "Task 2",
      targetModel: "model-x",
    });
    assert.equal(orchestrator.shouldTriggerBatch("model-x"), false);

    // Third task satisfies threshold of 3
    await orchestrator.enqueueTask({
      title: "Task 3",
      targetModel: "model-x",
    });
    assert.equal(orchestrator.shouldTriggerBatch("model-x"), true);

    // Milestone tag triggers immediately even for single task
    await orchestrator.enqueueTask({
      title: "Release Certification Security Audit",
      targetModel: "model-milestone",
      milestoneTag: "release",
    });
    assert.equal(orchestrator.shouldTriggerBatch("model-milestone"), true);
  });

  it("prepares storage via database vacuum, log reduction, and cache pruning", async () => {
    let vacuumCalled = false;
    let reductionCalled = false;
    let prunerCalled = false;

    const mockMaintenance = {
      runVacuumAndCompaction: async () => {
        vacuumCalled = true;
        return { vacuumed: true };
      },
      reduceOldTaskLogs: async () => {
        reductionCalled = true;
        return { reduced: 5 };
      },
    };

    const orchestrator = new BoutiqueBatchOrchestrator({
      maintenanceService: mockMaintenance,
      worktreePruner: async () => {
        prunerCalled = true;
        return 3;
      },
      diskProbe: async () => ({ freeBytes: 30 * 1024 * 1024 * 1024 }), // 30 GB free
      minFreeDiskBytes: 15 * 1024 * 1024 * 1024, // 15 GB required
    });

    const prep = await orchestrator.prepareStorage();

    assert.equal(vacuumCalled, true);
    assert.equal(reductionCalled, true);
    assert.equal(prunerCalled, true);
    assert.equal(prep.worktreesPruned, 3);
    assert.ok(prep.preFlightFreeBytes >= 15 * 1024 * 1024 * 1024);
  });

  it("aborts storage preparation and throws if available disk is below required threshold", async () => {
    const orchestrator = new BoutiqueBatchOrchestrator({
      diskProbe: async () => ({ freeBytes: 8 * 1024 * 1024 * 1024 }), // 8 GB free
      minFreeDiskBytes: 15 * 1024 * 1024 * 1024, // 15 GB required
    });

    await assert.rejects(
      async () => {
        await orchestrator.prepareStorage();
      },
      (err: Error) => {
        assert.ok(err.message.includes("Pre-flight storage gate failed"));
        assert.ok(err.message.includes("below required boutique buffer"));
        return true;
      },
    );
  });

  it("executes batch sequentially, pulls weights once, executes tasks, and deprovisions weights", async () => {
    let pullCalled = false;
    let deleteCalled = false;
    const executedTasks: string[] = [];

    const mockModelClient = {
      pullModel: async () => {
        pullCalled = true;
        return true;
      },
      deleteModel: async () => {
        deleteCalled = true;
        return true;
      },
    };

    const orchestrator = new BoutiqueBatchOrchestrator({
      modelClient: mockModelClient,
      batchSizeThreshold: 2,
      minFreeDiskBytes: 10 * 1024 * 1024 * 1024,
      diskProbe: async () => ({ freeBytes: 25 * 1024 * 1024 * 1024 }),
      taskExecutor: async (task: BoutiqueTask) => {
        executedTasks.push(task.id);
        return { audited: true, score: 98 };
      },
    });

    const t1 = await orchestrator.enqueueTask({
      title: "Batch Task 1",
      targetModel: "security-specialist:32b",
    });
    const t2 = await orchestrator.enqueueTask({
      title: "Batch Task 2",
      targetModel: "security-specialist:32b",
    });

    const result = await orchestrator.executeBatch("security-specialist:32b");

    assert.equal(pullCalled, true);
    assert.equal(deleteCalled, true);
    assert.equal(result.totalTasks, 2);
    assert.equal(result.successfulTasks, 2);
    assert.equal(result.failedTasks, 0);
    assert.equal(result.cleanupSuccess, true);
    assert.deepEqual(executedTasks, [t1.id, t2.id]);
    assert.equal(t1.status, "COMPLETED");
    assert.equal(t2.status, "COMPLETED");

    // Pending queue is now empty for this model
    assert.equal(orchestrator.getPendingQueue("security-specialist:32b").length, 0);
  });

  it("handles individual task failure gracefully while completing remainder of batch", async () => {
    let deleteCalled = false;
    const mockModelClient = {
      pullModel: async () => true,
      deleteModel: async () => {
        deleteCalled = true;
        return true;
      },
    };

    let callCount = 0;
    const orchestrator = new BoutiqueBatchOrchestrator({
      modelClient: mockModelClient,
      batchSizeThreshold: 2,
      diskProbe: async () => ({ freeBytes: 25 * 1024 * 1024 * 1024 }),
      taskExecutor: async (_task: BoutiqueTask) => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Simulated AST parse timeout in boutique task");
        }
        return { success: true };
      },
    });

    const t1 = await orchestrator.enqueueTask({
      title: "Flaky Task",
      targetModel: "audit-model:70b",
    });
    const t2 = await orchestrator.enqueueTask({
      title: "Solid Task",
      targetModel: "audit-model:70b",
    });

    const result = await orchestrator.executeBatch("audit-model:70b");

    assert.equal(result.totalTasks, 2);
    assert.equal(result.successfulTasks, 1);
    assert.equal(result.failedTasks, 1);
    assert.equal(t1.status, "FAILED");
    assert.equal(t1.error, "Simulated AST parse timeout in boutique task");
    assert.equal(t2.status, "COMPLETED");
    assert.equal(deleteCalled, true, "Weights must still be cleaned up after batch failure");
  });

  it("rejects batch execution when threshold is unsatisfied unless force is declared", async () => {
    const orchestrator = new BoutiqueBatchOrchestrator({
      batchSizeThreshold: 5,
      diskProbe: async () => ({ freeBytes: 25 * 1024 * 1024 * 1024 }),
    });

    await orchestrator.enqueueTask({
      title: "Lonely Task",
      targetModel: "sparse-model:14b",
    });

    await assert.rejects(
      async () => {
        await orchestrator.executeBatch("sparse-model:14b", { force: false });
      },
      (err: Error) => {
        assert.ok(err.message.includes("Batch criteria not satisfied"));
        return true;
      },
    );

    // With force: true, executes successfully
    const result = await orchestrator.executeBatch("sparse-model:14b", { force: true });
    assert.equal(result.totalTasks, 1);
  });

  it("provides comprehensive orchestrator status metrics", async () => {
    const orchestrator = new BoutiqueBatchOrchestrator();

    await orchestrator.enqueueTask({ title: "T1", targetModel: "model-a" });
    await orchestrator.enqueueTask({ title: "T2", targetModel: "model-a" });
    await orchestrator.enqueueTask({ title: "T3", targetModel: "model-b" });

    const status = orchestrator.getStatus();
    assert.equal(status.isRunning, false);
    assert.equal(status.totalQueuedCount, 3);
    assert.equal(status.queueByModel["model-a"], 2);
    assert.equal(status.queueByModel["model-b"], 1);
  });

  it("integrates with CacophonyHttpServer routes (/api/boutique/*)", async () => {
    const orchestrator = new BoutiqueBatchOrchestrator({
      batchSizeThreshold: 1,
      diskProbe: async () => ({ freeBytes: 25 * 1024 * 1024 * 1024 }),
    });

    const mockDaemon: any = {
      getBoutiqueOrchestrator: () => orchestrator,
      getUserSessionRepository: () => ({
        findSessionByToken: async () => null,
      }),
      getConfig: () => ({}),
      getTelemetryPoller: () => null,
      getTaskRepository: () => ({
        listPending: async () => [],
      }),
      getStreamTapManager: () => null,
    };

    const server = new CacophonyHttpServer(mockDaemon, { httpPort: 0, httpHost: "127.0.0.1" });
    await server.start();
    const port = server.getPort();
    assert.ok(port && port > 0);

    try {
      // 1. POST /api/boutique/enqueue
      const enqueueRes = await fetch(`http://127.0.0.1:${port}/api/boutique/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "HTTP Enqueue Test",
          targetModel: "boutique-http:latest",
        }),
      });
      assert.equal(enqueueRes.status, 201);
      const enqueueJson: any = await enqueueRes.json();
      assert.equal(enqueueJson.success, true);
      assert.equal(enqueueJson.task.title, "HTTP Enqueue Test");

      // 2. GET /api/boutique/queue
      const queueRes = await fetch(`http://127.0.0.1:${port}/api/boutique/queue`);
      assert.equal(queueRes.status, 200);
      const queueJson: any = await queueRes.json();
      assert.equal(queueJson.success, true);
      assert.equal(queueJson.count, 1);

      // 3. GET /api/boutique/status
      const statusRes = await fetch(`http://127.0.0.1:${port}/api/boutique/status`);
      assert.equal(statusRes.status, 200);
      const statusJson: any = await statusRes.json();
      assert.equal(statusJson.success, true);
      assert.equal(statusJson.status.totalQueuedCount, 1);

      // 4. POST /api/boutique/run-batch
      const runRes = await fetch(`http://127.0.0.1:${port}/api/boutique/run-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetModel: "boutique-http:latest",
          force: true,
        }),
      });
      assert.equal(runRes.status, 200);
      const runJson: any = await runRes.json();
      assert.equal(runJson.success, true);
      assert.equal(runJson.result.totalTasks, 1);
    } finally {
      await server.stop();
    }
  });
});
