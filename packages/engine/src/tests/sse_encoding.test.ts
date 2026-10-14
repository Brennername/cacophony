import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

describe("T97.4.3: SSE Broadcast Event Encoding with Special Newline Characters", () => {
  it("should safely encode newlines and carriage returns within JSON SSE messages without corrupting framing", () => {
    const rawContent = "Line 1\r\nLine 2\nLine 3\n\nDouble Newline";
    const payload = {
      type: "stream_token",
      taskId: "task-sse-1",
      token: rawContent,
      timestamp: Date.now(),
    };

    const sseFrame = `data: ${JSON.stringify(payload)}\n\n`;

    // Must end with exactly double newline
    assert.ok(sseFrame.endsWith("\n\n"));
    assert.ok(!sseFrame.endsWith("\n\n\n"));

    // Extract payload from data: line
    const dataPrefix = "data: ";
    assert.ok(sseFrame.startsWith(dataPrefix));
    const jsonStr = sseFrame.slice(dataPrefix.length, -2);
    const parsed = JSON.parse(jsonStr) as typeof payload;

    assert.strictEqual(parsed.type, "stream_token");
    assert.strictEqual(parsed.taskId, "task-sse-1");
    assert.strictEqual(parsed.token, rawContent);
  });
});
