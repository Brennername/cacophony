import test from "node:test";
import assert from "node:assert/strict";
import { StreamTapManager } from "../inference/StreamTapManager.js";

test("T67.6: Stream Tap Buffer Memory Governor and Rolling Eviction", async (t) => {
  await t.test("T67.6.1 & T67.6.2: Enforces max buffer limit with FIFO rolling truncation", () => {
    const manager = new StreamTapManager();
    assert.strictEqual(manager.maxBufferSize, 100000);

    const taskId = "task-truncation-test";
    const chunkA = "A".repeat(60000);
    const chunkB = "B".repeat(60000);

    manager.emitToken(taskId, chunkA);
    assert.strictEqual(manager.getBuffer(taskId).length, 60000);

    manager.emitToken(taskId, chunkB);
    const buffer = manager.getBuffer(taskId);
    assert.strictEqual(buffer.length, 100000);
    assert.ok(buffer.startsWith("A".repeat(40000)));
    assert.ok(buffer.endsWith("B".repeat(60000)));
  });

  await t.test("T67.6.3: Evicts stale buffers older than max age", () => {
    const manager = new StreamTapManager();
    const taskRecent = "task-recent";
    const taskOld = "task-old";

    manager.emitToken(taskRecent, "recent tokens");
    manager.emitToken(taskOld, "old tokens");

    // Manually run sweep with zero age threshold to simulate passage of 30+ minutes
    const evicted = manager.sweepStaleBuffers(0);
    assert.strictEqual(evicted, 2);
    assert.strictEqual(manager.getBuffer(taskRecent), "");
    assert.strictEqual(manager.getBuffer(taskOld), "");
  });
});
