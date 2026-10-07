import test from "node:test";
import assert from "node:assert/strict";
import { BackgroundTestWorkerPool } from "../testing/BackgroundTestWorkerPool.js";

test("BackgroundTestWorkerPool Suite (T92.3.1)", async (t) => {
  await t.test("should execute test command asynchronously and resolve result", async () => {
    const pool = new BackgroundTestWorkerPool({ maxConcurrency: 2 });

    const result = await pool.runTest({
      taskId: "test-task-1",
      command: "node -e 'console.log(\"PASS\"); process.exit(0)'",
      cwd: process.cwd(),
      timeoutMs: 5000,
    });

    assert.strictEqual(result.taskId, "test-task-1");
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.passed, true);
    assert.ok(result.stdout.includes("PASS"));
    assert.ok(result.durationMs >= 0);

    await pool.shutdown();
  });

  await t.test("should emit event on completion", async () => {
    const pool = new BackgroundTestWorkerPool({ maxConcurrency: 2 });
    let eventReceived: any = null;

    const unsubscribe = pool.onTestCompleted((res) => {
      eventReceived = res;
    });

    await pool.runTest({
      taskId: "test-task-2",
      command: "node -e 'process.exit(0)'",
      cwd: process.cwd(),
      timeoutMs: 5000,
    });

    assert.ok(eventReceived !== null);
    assert.strictEqual(eventReceived.taskId, "test-task-2");
    assert.strictEqual(eventReceived.passed, true);

    unsubscribe();
    await pool.shutdown();
  });
});
