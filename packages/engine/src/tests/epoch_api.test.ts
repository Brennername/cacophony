import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CacophonyHttpServer } from "../daemon/CacophonyHttpServer.js";

class MockEpochHealthRepo {
  public epochs: Array<{
    epochId: number;
    name: string;
    reason: string;
    startedAt: string;
    endedAt: string | null;
    isActive: boolean;
    taskCount: number;
    successCount: number;
    failureCount: number;
    notes: string;
  }> = [
    {
      epochId: 1,
      name: "Epoch 1 (Baseline)",
      reason: "Initial arena baseline",
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      endedAt: null,
      isActive: true,
      taskCount: 15,
      successCount: 12,
      failureCount: 3,
      notes: ""
    }
  ];

  public history = [
    {
      historyId: 1,
      epochId: 1,
      modelId: "qwen2.5-coder:7b",
      totalTasks: 15,
      totalSuccess: 12,
      totalFailures: 3,
      successRate: 0.8,
      status: "ACTIVE",
      snapshotAt: new Date().toISOString()
    }
  ];

  public async getCurrentEpoch() {
    return this.epochs.find((e) => e.isActive) || this.epochs[0];
  }

  public async listEpochs() {
    return this.epochs;
  }

  public async advanceEpoch(name: string, reason: string, notes?: string) {
    const current = this.epochs.find((e) => e.isActive);
    if (current) {
      current.isActive = false;
      current.endedAt = new Date().toISOString();
    }
    const newEpoch = {
      epochId: this.epochs.length + 1,
      name,
      reason,
      startedAt: new Date().toISOString(),
      endedAt: null,
      isActive: true,
      taskCount: 0,
      successCount: 0,
      failureCount: 0,
      notes: notes || ""
    };
    this.epochs.push(newEpoch);
    return newEpoch;
  }

  public async resetAllStats() {
    return;
  }

  public async getEpochHistory(epochId: number) {
    return this.history.filter((h) => h.epochId === epochId);
  }

  public async listProfiles() {
    return [];
  }
}

class MockDaemonForEpochs {
  public healthRepo = new MockEpochHealthRepo();

  public getModelHealthRepository() {
    return this.healthRepo;
  }

  public getTenancyGuard() {
    return null;
  }

  public getModelManager() {
    return null;
  }

  public getBenchmarkRunner() {
    return null;
  }

  public getStreamTapManager() {
    return null;
  }

  public getTaskRepository() {
    return { listPending: async () => [] };
  }

  public getTelemetryPoller() {
    return null;
  }

  public getUserSessionRepository() {
    return null;
  }
}

describe("Arena Epoch REST API Integration Suite (T82.3)", () => {
  let server: CacophonyHttpServer;
  let baseUrl: string;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  async function startServer(): Promise<void> {
    const mockDaemon = new MockDaemonForEpochs();
    server = new CacophonyHttpServer(mockDaemon as any, { httpPort: 0, httpHost: "127.0.0.1" });
    await server.start();
    const address = (server as any).server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  }

  test("GET /api/arena/epochs should return active epoch and history", async () => {
    await startServer();
    const res = await fetch(`${baseUrl}/api/arena/epochs`);
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.current);
    assert.equal(data.current.epochId, 1);
    assert.equal(data.current.isActive, true);
    assert.equal(data.epochs.length, 1);
  });

  test("POST /api/models/epoch should advance active epoch", async () => {
    await startServer();
    const res = await fetch(`${baseUrl}/api/models/epoch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Epoch 2: Architecture Upgrade",
        reason: "Clean slate reset after pipeline repair",
        notes: "Restoring active models"
      })
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.success, true);
    assert.equal(data.epoch.epochId, 2);
    assert.equal(data.epoch.name, "Epoch 2: Architecture Upgrade");
    assert.equal(data.epoch.isActive, true);

    // Verify subsequent GET returns Epoch 2 as current
    const checkRes = await fetch(`${baseUrl}/api/arena/epochs`);
    const checkData = (await checkRes.json()) as any;
    assert.equal(checkData.current.epochId, 2);
    assert.equal(checkData.epochs.length, 2);
  });

  test("POST /api/models/reset-stats should reset model health stats", async () => {
    await startServer();
    const res = await fetch(`${baseUrl}/api/models/reset-stats`, {
      method: "POST"
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.success, true);
    assert.ok(data.message.includes("reset"));
  });

  test("GET /api/arena/epochs/:id/history should return historical snapshots", async () => {
    await startServer();
    const res = await fetch(`${baseUrl}/api/arena/epochs/1/history`);
    assert.equal(res.status, 200);
    const data = (await res.json()) as any[];
    assert.equal(data.length, 1);
    assert.equal(data[0].modelId, "qwen2.5-coder:7b");
    assert.equal(data[0].epochId, 1);
  });
});
