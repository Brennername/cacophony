import { test } from "node:test";
import assert from "node:assert/strict";
import { GenerationHeartbeatTracker } from "../inference/GenerationHeartbeatTracker.js";

test("GenerationHeartbeatTracker Suite", async (t) => {
  await t.test("should start in ingesting_prompt state before first token", () => {
    const tracker = new GenerationHeartbeatTracker({
      taskId: "task-test-hb-1",
      modelId: "qwen2.5-coder:7b",
      stallThresholdMs: 500
    });

    tracker.start();
    const sample = tracker.sample();
    assert.equal(sample.taskId, "task-test-hb-1");
    assert.equal(sample.state, "ingesting_prompt");
    assert.equal(sample.tokensEmitted, 0);
    assert.equal(sample.timeToFirstTokenMs, null);
  });

  await t.test("should transition to streaming on first token and calculate TPS", async () => {
    const tracker = new GenerationHeartbeatTracker({
      taskId: "task-test-hb-2",
      modelId: "qwen2.5-coder:7b"
    });

    tracker.start();
    await new Promise((r) => setTimeout(r, 20));
    tracker.recordToken(10);

    const sample = tracker.sample();
    assert.equal(sample.state, "streaming");
    assert.equal(sample.tokensEmitted, 10);
    assert.ok(sample.timeToFirstTokenMs !== null && sample.timeToFirstTokenMs >= 15);
  });

  await t.test("should detect stall when idle exceeds threshold", async () => {
    const tracker = new GenerationHeartbeatTracker({
      taskId: "task-test-hb-3",
      modelId: "qwen2.5-coder:7b",
      stallThresholdMs: 30
    });

    tracker.start();
    tracker.recordToken(5);
    await new Promise((r) => setTimeout(r, 45));

    const sample = tracker.sample();
    assert.equal(sample.state, "stalled");
    assert.ok(sample.idleMs >= 30);
  });

  await t.test("should conclude cleanly with completed state", () => {
    const tracker = new GenerationHeartbeatTracker({
      taskId: "task-test-hb-4",
      modelId: "qwen2.5-coder:7b"
    });

    tracker.start();
    tracker.recordToken(5);
    const finalSample = tracker.finish();
    assert.equal(finalSample.state, "completed");
  });
});
