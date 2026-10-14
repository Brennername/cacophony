import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { StreamTapManager } from "../inference/StreamTapManager.js";

describe("T97.4.1: StreamTapManager Ring Buffer FIFO Truncation", () => {
  it("should enforce maxBufferSize limit and drop oldest characters when exceeded", () => {
    const manager = new StreamTapManager();
    const taskId = "task-ring-1";

    const chunkSize = 60000;
    const chunkA = "A".repeat(chunkSize);
    const chunkB = "B".repeat(chunkSize);

    manager.enforceBufferLimit(taskId, chunkA);
    const buf1 = manager.getBuffer(taskId);
    assert.strictEqual(buf1.length, chunkSize);
    assert.strictEqual(buf1, chunkA);

    manager.enforceBufferLimit(taskId, chunkB);
    const buf2 = manager.getBuffer(taskId);
    assert.strictEqual(buf2.length, manager.maxBufferSize);
    // Oldest A characters should be truncated, remaining ends with all B's
    assert.ok(buf2.endsWith(chunkB));
    assert.ok(buf2.startsWith("A".repeat(manager.maxBufferSize - chunkSize)));
  });
});
