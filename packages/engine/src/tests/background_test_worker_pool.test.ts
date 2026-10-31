import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BackgroundTestWorkerPool } from "../testing/BackgroundTestWorkerPool.js";

describe("BackgroundTestWorkerPool Test Suite (T102.8.4)", () => {
  describe("Job Execution and Result Formatting", () => {
    it("should execute a successful command and return passed status with stdout", async () => {
      const pool = new BackgroundTestWorkerPool({ maxConcurrency: 2 });
      const result = await pool.runTest({
        taskId: "task-success-01",
        command: "echo 'Test execution successful'",
        cwd: process.cwd(),
      });

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes("Test execution successful"));
      assert.strictEqual(result.taskId, "task-success-01");
      assert.ok(result.durationMs >= 0);
    });

    it("should return passed=false when child process exits with non-zero code", async () => {
      const pool = new BackgroundTestWorkerPool({ maxConcurrency: 2 });
      const result = await pool.runTest({
        taskId: "task-fail-02",
        command: "echo 'Synthetic assertion failure' >&2; exit 2",
        cwd: process.cwd(),
      });

      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.exitCode, 2);
      assert.ok(result.stderr.includes("Synthetic assertion failure"));
    });

    it("should terminate jobs exceeding configured timeoutMs", async () => {
      const pool = new BackgroundTestWorkerPool({
        maxConcurrency: 2,
        defaultTimeoutMs: 50,
      });

      const result = await pool.runTest({
        taskId: "task-timeout-03",
        command: "sleep 1",
        cwd: process.cwd(),
        timeoutMs: 50,
      });

      assert.strictEqual(result.passed, false);
      assert.strictEqual(pool.getActiveCount(), 0);
    });
  });

  describe("Concurrency Limits and Queue Draining", () => {
    it("should respect maxConcurrency by queuing jobs and draining sequentially", async () => {
      const pool = new BackgroundTestWorkerPool({ maxConcurrency: 1 });

      const job1Promise = pool.runTest({
        taskId: "job-1",
        command: "sleep 0.05; echo 'Job 1 finished'",
        cwd: process.cwd(),
      });

      const job2Promise = pool.runTest({
        taskId: "job-2",
        command: "echo 'Job 2 finished'",
        cwd: process.cwd(),
      });

      assert.strictEqual(pool.getActiveCount(), 1);
      assert.strictEqual(pool.getQueueLength(), 1);

      const [res1, res2] = await Promise.all([job1Promise, job2Promise]);

      assert.strictEqual(res1?.passed, true);
      assert.ok(res1?.stdout.includes("Job 1 finished"));
      assert.strictEqual(res2?.passed, true);
      assert.ok(res2?.stdout.includes("Job 2 finished"));
      assert.strictEqual(pool.getActiveCount(), 0);
      assert.strictEqual(pool.getQueueLength(), 0);
    });
  });

  describe("Event Emission and Teardown", () => {
    it("should emit completion events for general and task-specific listeners", async () => {
      const pool = new BackgroundTestWorkerPool({ maxConcurrency: 2 });
      let generalEmitted = false;
      let taskSpecificEmitted = false;

      const unsubscribeGeneral = pool.onTestCompleted((res) => {
        if (res.taskId === "event-task-01") generalEmitted = true;
      });

      const unsubscribeTask = pool.onTestCompleted((res) => {
        if (res.taskId === "event-task-01") taskSpecificEmitted = true;
      }, "event-task-01");

      await pool.runTest({
        taskId: "event-task-01",
        command: "echo 'Event stream verification'",
        cwd: process.cwd(),
      });

      assert.strictEqual(generalEmitted, true);
      assert.strictEqual(taskSpecificEmitted, true);

      unsubscribeGeneral();
      unsubscribeTask();
    });

    it("should reject new jobs and kill running jobs on shutdown", async () => {
      const pool = new BackgroundTestWorkerPool({ maxConcurrency: 2 });
      void pool.runTest({
        taskId: "shutdown-job",
        command: "sleep 10",
        cwd: process.cwd(),
      });

      await pool.shutdown();
      assert.strictEqual(pool.getActiveCount(), 0);
      assert.strictEqual(pool.getQueueLength(), 0);

      await assert.rejects(
        () =>
          pool.runTest({
            taskId: "post-shutdown-job",
            command: "echo 'will not run'",
            cwd: process.cwd(),
          }),
        /BackgroundTestWorkerPool is shutting down/,
      );
    });
  });
});
