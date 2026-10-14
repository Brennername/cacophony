import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { CacophonyHttpServer } from "../daemon/CacophonyHttpServer.js";
import { AutonomousWorkerPipeline } from "../scheduler/AutonomousWorkerPipeline.js";

/**
 * Mock AutonomousWorkerPipeline that implements diagnostic configuration and eviction controls.
 */
class MockWorkerPipeline {
  private debugTaskPipeline = false;
  private maxRetainedDiagnostics = 100;

  public isDebugTaskPipeline(): boolean {
    return this.debugTaskPipeline;
  }

  public setDebugTaskPipeline(enabled: boolean): void {
    this.debugTaskPipeline = enabled;
  }

  public getMaxRetainedDiagnostics(): number {
    return this.maxRetainedDiagnostics;
  }

  public setMaxRetainedDiagnostics(limit: number): void {
    if (limit > 0) {
      this.maxRetainedDiagnostics = limit;
    }
  }
}

/**
 * Mock CacophonyDaemon satisfying HTTP server routing requirements.
 */
class MockDaemon {
  public workerPipeline = new MockWorkerPipeline();
  public taskRecord = new Map<string, any>([
    [
      "task-test-1",
      {
        id: "task-test-1",
        title: "Test Task Failure",
        status: "FAILED",
        role: "implementer",
        priority: "P0",
        modelAssigned: "qwen2.5-coder:7b",
        testCommand: "npm test",
        logSnippet: "--- a/foo.ts\n+++ b/foo.ts",
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ],
  ]);

  public stagesRecord: Record<string, any[]> = {
    "task-test-1": [
      {
        id: "st-1",
        taskId: "task-test-1",
        stageName: "generation",
        stageStatus: "SUCCESS",
        durationMs: 1200,
        logOutput: "export function run() {}",
      },
      {
        id: "st-2",
        taskId: "task-test-1",
        stageName: "remediation",
        stageStatus: "FAILURE",
        durationMs: 450,
        logOutput: "FAIL: AssertionError: Expected true to be false",
      },
    ],
  };

  public getWorkerPipeline() {
    return this.workerPipeline;
  }

  public getTaskRepository() {
    return {
      getById: async (id: string) => this.taskRecord.get(id) || null,
      retryFailedTasks: async (taskId?: string, _force?: boolean) => {
        if (taskId && this.taskRecord.has(taskId)) {
          const rec = this.taskRecord.get(taskId);
          rec.status = "PENDING";
          return 1;
        }
        return 0;
      },
      listPending: async () => [],
    };
  }

  public getStageRepository() {
    return {
      getStagesForTask: async (taskId: string) =>
        this.stagesRecord[taskId] || [],
    };
  }

  public getStreamTapManager() {
    return null;
  }

  public getTelemetryPoller() {
    return null;
  }

  public getUserSessionRepository() {
    return null;
  }
}

describe("Dynamic Diagnostics & Post-Mortem Tracing Suite (T70.4)", () => {
  let server: CacophonyHttpServer;
  let mockDaemon: MockDaemon;
  let baseUrl: string;

  beforeEach(async () => {
    mockDaemon = new MockDaemon();
    server = new CacophonyHttpServer(mockDaemon as any, {
      httpPort: 0,
      httpHost: "127.0.0.1",
    });
    await server.start();
    const address = (server as any).server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  test("GET /api/diagnostics/config returns active tracing state and limits", async () => {
    const res = await fetch(`${baseUrl}/api/diagnostics/config`);
    assert.equal(res.status, 200);
    const data = (await res.json()) as {
      debugTaskPipeline: boolean;
      diagnosticsDir: string;
      maxRetainedDiagnostics: number;
    };
    assert.equal(data.debugTaskPipeline, false);
    assert.equal(data.diagnosticsDir, ".cacophony/diagnostics");
    assert.equal(data.maxRetainedDiagnostics, 100);
  });

  test("PUT /api/diagnostics/config dynamically toggles tracing without daemon restart", async () => {
    // Enable tracing and alter eviction limit
    const putRes = await fetch(`${baseUrl}/api/diagnostics/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        debugTaskPipeline: true,
        maxRetainedDiagnostics: 42,
      }),
    });
    assert.equal(putRes.status, 200);
    const putData = (await putRes.json()) as {
      success: boolean;
      debugTaskPipeline: boolean;
      maxRetainedDiagnostics: number;
    };
    assert.equal(putData.success, true);
    assert.equal(putData.debugTaskPipeline, true);
    assert.equal(putData.maxRetainedDiagnostics, 42);

    // Verify GET reflects mutated configuration
    const getRes = await fetch(`${baseUrl}/api/diagnostics/config`);
    const getData = (await getRes.json()) as {
      debugTaskPipeline: boolean;
      maxRetainedDiagnostics: number;
    };
    assert.equal(getData.debugTaskPipeline, true);
    assert.equal(getData.maxRetainedDiagnostics, 42);

    // Toggle tracing back off
    await fetch(`${baseUrl}/api/diagnostics/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debugTaskPipeline: false }),
    });
    const toggledRes = await fetch(`${baseUrl}/api/diagnostics/config`);
    const toggledData = (await toggledRes.json()) as {
      debugTaskPipeline: boolean;
    };
    assert.equal(toggledData.debugTaskPipeline, false);
  });

  test("POST /api/tasks/:id/retry triggers forced task requeue", async () => {
    const res = await fetch(`${baseUrl}/api/tasks/task-test-1/retry`, {
      method: "POST",
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as {
      success: boolean;
      taskId: string;
      requeued: boolean;
      requeuedCount: number;
    };
    assert.equal(data.success, true);
    assert.equal(data.taskId, "task-test-1");
    assert.equal(data.requeued, true);
    assert.equal(data.requeuedCount, 1);
    assert.equal(mockDaemon.taskRecord.get("task-test-1")?.status, "PENDING");
  });

  test("GET /api/tasks/:id/diagnostics extracts post-mortem telemetry and stage diffs", async () => {
    const res = await fetch(`${baseUrl}/api/tasks/task-test-1/diagnostics`);
    assert.equal(res.status, 200);
    const data = (await res.json()) as {
      taskId: string;
      foundOnDisk: boolean;
      model: string;
      exitCode: number;
      stderr: string;
      preScrubbedOutput: string;
      scrubberDiff: string;
      stages: any[];
    };
    assert.equal(data.taskId, "task-test-1");
    assert.equal(data.model, "qwen2.5-coder:7b");
    assert.equal(data.exitCode, 1);
    assert.ok(data.stderr.includes("FAIL: AssertionError"));
    assert.ok(data.preScrubbedOutput.includes("export function run()"));
    assert.ok(data.scrubberDiff.includes("--- a/foo.ts"));
    assert.equal(data.stages.length, 2);
  });

  test("AutonomousWorkerPipeline rolling eviction prunes oldest diagnostics exceeding limit", async () => {
    // Create temporary workspace for isolation
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-evict-"));
    const diagDir = path.join(tempRoot, ".cacophony/diagnostics");
    await fs.mkdir(diagDir, { recursive: true });

    try {
      // Create 5 diagnostic dumps with staggered modification times
      const files: string[] = [];
      const baseTime = Date.now() - 50000;
      for (let i = 1; i <= 5; i++) {
        const filePath = path.join(diagDir, `task-${i}.json`);
        await fs.writeFile(
          filePath,
          JSON.stringify({ taskId: `task-${i}`, payload: i }),
          "utf-8",
        );
        // Stagger mtime so task-1 is oldest and task-5 is newest
        const mtime = new Date(baseTime + i * 1000);
        await fs.utimes(filePath, mtime, mtime);
        files.push(filePath);
      }

      // Instantiate pipeline pointing to temporary workspace
      const pipeline = new AutonomousWorkerPipeline({
        workspaceRoot: tempRoot,
        ollamaProvider: {} as any,
        contextMinimizer: {} as any,
        parser: {} as any,
        ruleEngine: {} as any,
      });

      // Clean with limit = 2 (should evict 3 oldest: task-1, task-2, task-3)
      const evicted = await pipeline.cleanOldDiagnostics(2);
      assert.equal(evicted, 3);

      const remaining = await fs.readdir(diagDir);
      assert.equal(remaining.length, 2);
      assert.ok(remaining.includes("task-4.json"));
      assert.ok(remaining.includes("task-5.json"));
      assert.ok(!remaining.includes("task-1.json"));
      assert.ok(!remaining.includes("task-2.json"));
      assert.ok(!remaining.includes("task-3.json"));
    } finally {
      // Clean up temporary workspace directory
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("AutonomousWorkerPipeline logDiagnostic writes dump and applies eviction threshold", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-logdiag-"));
    const diagDir = path.join(tempRoot, ".cacophony/diagnostics");

    try {
      const pipeline = new AutonomousWorkerPipeline({
        workspaceRoot: tempRoot,
        ollamaProvider: {} as any,
        contextMinimizer: {} as any,
        parser: {} as any,
        ruleEngine: {} as any,
      });

      pipeline.setDebugTaskPipeline(true);
      pipeline.setMaxRetainedDiagnostics(2);

      await pipeline.logDiagnostic("task-a", { info: "first" });
      await pipeline.logDiagnostic("task-b", { info: "second" });
      await pipeline.logDiagnostic("task-c", { info: "third" });

      const files = await fs.readdir(diagDir);
      assert.ok(files.length <= 2, `Expected at most 2 diagnostic files, got ${files.length}`);
      assert.ok(files.includes("task-c.json"));
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
