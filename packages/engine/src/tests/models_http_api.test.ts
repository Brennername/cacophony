import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CacophonyHttpServer } from "../daemon/CacophonyHttpServer.js";
import { ModelTenancyGuard } from "../scheduler/ModelTenancyGuard.js";

class MockDaemon {
  public healthRepo = {
    listProfiles: async () => [
      {
        modelId: "qwen2.5-coder:7b",
        provider: "ollama",
        totalTasks: 10,
        totalSuccess: 7,
        totalFailures: 3,
        consecutiveFailures: 0,
        avgLatencyMs: 1200,
        avgTokensPerSec: 25.0,
        status: "ACTIVE",
        lastUsedAt: new Date().toISOString(),
      },
    ],
    updateStatus: async () => {},
  };

  public tenancyGuard = new ModelTenancyGuard({
    managedModelsEnabled: true,
    protectedModels: ["protected-model"],
    maxDiskStorageGb: 50,
    autoEvictionEnabled: true,
    minimumSuccessRateThreshold: 0.4,
    maxConsecutiveFailuresBeforeEviction: 3,
  });

  public modelManager = {
    listInstalledModels: async () => [
      {
        name: "qwen2.5-coder:7b",
        model: "qwen2.5-coder:7b",
        modifiedAt: new Date().toISOString(),
        sizeBytes: 4683075584,
        digest: "sha256:123",
        details: {
          parentModel: "",
          format: "gguf",
          family: "qwen2",
          families: ["qwen2"],
          parameterSize: "7B",
          quantizationLevel: "Q4_K_M",
        },
        isProtected: false,
        isLoadedInVram: true,
      },
    ],
    pullModel: async () => {},
    deleteModel: async () => true,
    showModelInfo: async () => ({}),
  };

  public benchmarkRunner = {
    benchmark: async (model: string) => ({
      modelId: model,
      success: true,
      durationMs: 500,
      tokensPrompt: 50,
      tokensCompletion: 100,
      tokensPerSec: 50.0,
      generatedCodeLength: 200,
      syntaxValid: true,
    }),
  };

  public getModelHealthRepository() {
    return this.healthRepo;
  }
  public getTenancyGuard() {
    return this.tenancyGuard;
  }
  public getModelManager() {
    return this.modelManager;
  }
  public getBenchmarkRunner() {
    return this.benchmarkRunner;
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
  public vramPrefetchCoordinator = {
    preloadModel: async (_model: string, _keepAlive?: string | number) => true,
    getTelemetry: () => ({
      prefetchesInitiated: 5,
      hits: 4,
      misses: 1,
      hitRatio: 0.8,
      lastPrefetchedModel: "deepseek-r1:8b",
      isPrefetchInProgress: false,
    }),
  };
  public getVramPrefetchCoordinator() {
    return this.vramPrefetchCoordinator as any;
  }
}


describe("Model Management HTTP REST Endpoints Suite", () => {
  let server: CacophonyHttpServer;
  let port: number;
  let baseUrl: string;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  async function startServer(): Promise<void> {
    const mockDaemon = new MockDaemon();
    server = new CacophonyHttpServer(mockDaemon as any, {
      httpPort: 0,
      httpHost: "127.0.0.1",
    });
    await server.start();
    const address = (server as any).server.address();
    port = address.port;
    baseUrl = `http://127.0.0.1:${port}`;
  }

  test("GET /api/models/installed should return installed models list", async () => {
    await startServer();
    const res = await fetch(`${baseUrl}/api/models/installed`);
    assert.equal(res.status, 200);
    const data = (await res.json()) as any[];
    assert.equal(data.length, 1);
    assert.equal(data[0].name, "qwen2.5-coder:7b");
    assert.equal(data[0].isLoadedInVram, true);
  });

  test("GET /api/models/config and PUT /api/models/config should read and update config", async () => {
    await startServer();
    const getRes = await fetch(`${baseUrl}/api/models/config`);
    assert.equal(getRes.status, 200);
    const config = (await getRes.json()) as any;
    assert.equal(config.managedModelsEnabled, true);

    const putRes = await fetch(`${baseUrl}/api/models/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoEvictionEnabled: false }),
    });
    assert.equal(putRes.status, 200);
    const updated = (await putRes.json()) as any;
    assert.equal(updated.config.autoEvictionEnabled, false);
  });

  test("DELETE /api/models/:modelId should reject protected model and allow non-protected", async () => {
    await startServer();
    // 1. Attempt deleting protected model
    const rejectRes = await fetch(`${baseUrl}/api/models/protected-model`, {
      method: "DELETE",
    });
    assert.equal(rejectRes.status, 403);
    const rejectData = (await rejectRes.json()) as any;
    assert.match(rejectData.error, /protected under user tenancy whitelist/);

    // 2. Delete non-protected model
    const allowRes = await fetch(`${baseUrl}/api/models/unprotected-model`, {
      method: "DELETE",
    });
    assert.equal(allowRes.status, 200);
    const allowData = (await allowRes.json()) as any;
    assert.equal(allowData.success, true);
  });

  test("POST /api/models/benchmark should execute benchmark and return metrics", async () => {
    await startServer();
    const res = await fetch(`${baseUrl}/api/models/benchmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "qwen2.5-coder:3b" }),
    });
    assert.equal(res.status, 200);
    const result = (await res.json()) as any;
    assert.equal(result.success, true);
    assert.equal(result.modelId, "qwen2.5-coder:3b");
    assert.equal(result.tokensPerSec, 50.0);
  });

  test("POST /api/models/pull should initiate model download", async () => {
    await startServer();
    const res = await fetch(`${baseUrl}/api/models/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "qwen2.5-coder:3b" }),
    });
    assert.equal(res.status, 202);
    const result = (await res.json()) as any;
    assert.equal(result.status, "pulling");
    assert.equal(result.model, "qwen2.5-coder:3b");
  });

  test("POST /api/models/preload should reject payload without model parameter with 400", async () => {
    await startServer();
    const res = await fetch(`${baseUrl}/api/models/preload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const result = (await res.json()) as any;
    assert.equal(result.error, "Missing or invalid 'model' parameter");
  });

  test("POST /api/models/preload should trigger model preload and return 200", async () => {
    await startServer();
    const res = await fetch(`${baseUrl}/api/models/preload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-r1:8b", keep_alive: "15m" }),
    });
    assert.equal(res.status, 200);
    const result = (await res.json()) as any;
    assert.equal(result.status, "ok");
    assert.equal(result.model, "deepseek-r1:8b");
    assert.equal(result.message, "Model preload initiated successfully");
  });

  test("GET /api/models/preload should return prefetch telemetry", async () => {
    await startServer();
    const res = await fetch(`${baseUrl}/api/models/preload`);
    assert.equal(res.status, 200);
    const result = (await res.json()) as any;
    assert.equal(result.prefetchesInitiated, 5);
    assert.equal(result.hits, 4);
    assert.equal(result.misses, 1);
    assert.equal(result.hitRatio, 0.8);
    assert.equal(result.lastPrefetchedModel, "deepseek-r1:8b");
  });
});

