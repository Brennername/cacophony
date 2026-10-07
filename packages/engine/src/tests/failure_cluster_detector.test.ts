import test from "node:test";
import assert from "node:assert/strict";
import { FailureClusterDetector, type TaskOutcome } from "../analytics/FailureClusterDetector.js";

test("FailureClusterDetector Suite (T91.1.1)", async (t) => {
  await t.test("should not trigger alert when failures are below threshold or single model", () => {
    const detector = new FailureClusterDetector({ windowSize: 10, minFailuresForBurst: 4, minDistinctModels: 2 });

    // 3 failures on same model
    detector.recordTaskOutcome({ taskId: "t1", modelId: "model-a", status: "FAILED", timestamp: Date.now() });
    detector.recordTaskOutcome({ taskId: "t2", modelId: "model-a", status: "FAILED", timestamp: Date.now() });
    const alert = detector.recordTaskOutcome({ taskId: "t3", modelId: "model-a", status: "FAILED", timestamp: Date.now() });

    assert.strictEqual(alert, null);
    assert.strictEqual(detector.isBurstActive(), false);
  });

  await t.test("should trigger REGRESSION_BURST_ALERT on high-density multi-model failures", () => {
    const detector = new FailureClusterDetector({ windowSize: 10, minFailuresForBurst: 4, minDistinctModels: 2 });

    const outcomes: TaskOutcome[] = [
      { taskId: "t1", modelId: "model-a", status: "FAILED", timestamp: 100 },
      { taskId: "t2", modelId: "model-b", status: "FAILED", timestamp: 200 },
      { taskId: "t3", modelId: "model-a", status: "COMPLETED", timestamp: 300 },
      { taskId: "t4", modelId: "model-b", status: "FAILED", timestamp: 400 },
      { taskId: "t5", modelId: "model-c", status: "FAILED", timestamp: 500 },
    ];

    let lastAlert = null;
    for (const outcome of outcomes) {
      const res = detector.recordTaskOutcome(outcome);
      if (res) lastAlert = res;
    }

    assert.ok(lastAlert !== null, "Alert should be triggered when 4 failures occur across distinct models");
    assert.strictEqual(detector.isBurstActive(), true);
    assert.strictEqual(lastAlert?.failureCount, 4);
    assert.ok(lastAlert?.distinctModels.includes("model-a"));
    assert.ok(lastAlert?.distinctModels.includes("model-b"));
    assert.ok(lastAlert?.distinctModels.includes("model-c"));
  });

  await t.test("should trigger alert on consecutive failure streak across distinct models", () => {
    const detector = new FailureClusterDetector({ windowSize: 10, minConsecutiveFailures: 3, minDistinctModels: 2 });

    detector.recordTaskOutcome({ taskId: "t1", modelId: "model-a", status: "COMPLETED", timestamp: 100 });
    detector.recordTaskOutcome({ taskId: "t2", modelId: "model-a", status: "FAILED", timestamp: 200 });
    detector.recordTaskOutcome({ taskId: "t3", modelId: "model-b", status: "FAILED", timestamp: 300 });
    const alert = detector.recordTaskOutcome({ taskId: "t4", modelId: "model-a", status: "FAILED", timestamp: 400 });

    assert.ok(alert !== null, "Consecutive failure streak across distinct models should trigger alert");
    assert.ok(alert?.reason.includes("Consecutive failure streak"));

    detector.acknowledgeAlert();
    assert.strictEqual(detector.isBurstActive(), false);
  });
});
