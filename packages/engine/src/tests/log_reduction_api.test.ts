import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";
import type { TaskRecord } from "@cacophony/shared-types";

describe("Phase 104: Log Reduction & Statistical Histograms HTTP API", () => {
  let tempDir: string;
  let daemon: CacophonyDaemon;
  let testHttpPort: number;
  const testSocket = path.join(
    os.tmpdir(),
    `test-reduct-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`,
  );

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-reduct-api-"));
    const distMock = path.join(tempDir, "dist");
    await fs.mkdir(distMock, { recursive: true });
    await fs.writeFile(
      path.join(distMock, "index.html"),
      "<!doctype html><html><body>Cacophony Reduction Test</body></html>",
      "utf-8",
    );

    daemon = new CacophonyDaemon({
      dbPath: path.join(tempDir, "test_db"),
      socketPath: testSocket,
      httpPort: 0,
      httpHost: "127.0.0.1",
      frontendDistPath: distMock,
      startScheduler: false,
    });

    await daemon.start();
    testHttpPort = daemon.getHttpServer()?.getPort() || 0;
  });

  after(async () => {
    await daemon.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
    try {
      await fs.unlink(testSocket);
    } catch {
      // ignore
    }
  });

  it("should trigger log reduction and return statistical histograms via POST /api/database/reduce", async () => {
    const taskRepo = daemon.getTaskRepository();
    const stageRepo = daemon.getStageRepository();

    const taskId = "task-reduct-api-01";
    const oldDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const task: TaskRecord = {
      id: taskId,
      title: "Historical arena task for API reduction test",
      prompt: "Refactor telemetry pipeline",
      role: "implementer",
      status: "COMPLETED",
      priority: "P1",
      modelAssigned: "qwen2.5-coder:7b",
      testCommand: "npm test",
      focusFiles: "src/telemetry.ts",
      targetBranch: "main",
      prUrl: null,
      failureCount: 1,
      createdAt: oldDate,
      updatedAt: oldDate,
      completedAt: oldDate,
    };

    await taskRepo.create(task);

    // Add a bulky test execution stage
    const bulkyTestOutput = "FAIL test_telemetry.ts\n" + "AssertionError: expected true\n".repeat(80);
    const stageId = await stageRepo.recordStageStart(taskId, "test_execution");
    await stageRepo.recordStageCompletion(
      stageId,
      "FAILURE",
      bulkyTestOutput,
      0,
      0,
      3500,
    );

    // Call POST /api/database/reduce?taskId=task-reduct-api-01
    const res = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/database/reduce?taskId=${taskId}`,
      { method: "POST" },
    );

    assert.equal(res.status, 200);
    const body = await res.json() as {
      taskId: string;
      result: {
        stagesReduced: number;
        reclaimedBytes: number;
        durationBuckets: Record<string, number>;
      };
    };

    assert.equal(body.taskId, taskId);
    assert.equal(body.result.stagesReduced, 1);
    assert.ok(body.result.reclaimedBytes > 1000);

    // Verify stage in DB has reduced notice with exact user phrase
    const stages = await stageRepo.getStagesForTask(taskId);
    assert.ok(stages[0]?.logOutput?.startsWith("The log of this has been reduced, this is it's histogram:"));

    // Verify GET /api/database/reduction-logs retrieves audit entries
    const logsRes = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/database/reduction-logs?limit=10`,
      { method: "GET" },
    );
    assert.equal(logsRes.status, 200);
    const logs = await logsRes.json() as Array<{ taskId: string; stagesReduced: number }>;
    assert.ok(logs.length >= 1);
    assert.equal(logs[0]?.taskId, taskId);
  });

  it("should include reduction in POST /api/database/maintenance", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testHttpPort}/api/database/maintenance`,
      { method: "POST" },
    );

    assert.equal(res.status, 200);
    const body = await res.json() as {
      compaction: { durationMs: number };
      partition: { archivedCount: number };
      reduction: { tasksEvaluated: number; stagesReduced: number } | null;
      metrics: { isOverThreshold: boolean };
    };

    assert.ok(body.compaction);
    assert.ok(body.partition);
    assert.ok(body.reduction !== null);
    assert.ok(body.metrics);
  });
});
