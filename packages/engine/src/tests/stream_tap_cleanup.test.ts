import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { StreamTapManager } from "../inference/StreamTapManager.js";

describe("T97.4.2: StreamTapManager Listener Subscription Cleanup", () => {
  it("should deregister listener callback when unsubscribe returned function is invoked", () => {
    const manager = new StreamTapManager();
    const taskId = "task-cleanup-1";
    const receivedTokens: string[] = [];

    const unsubscribe = manager.tap((event) => {
      receivedTokens.push(event.token);
    }, taskId);

    manager.emitToken(taskId, "token-1");
    manager.emitToken(taskId, "token-2");
    assert.strictEqual(receivedTokens.length, 2);

    unsubscribe();

    manager.emitToken(taskId, "token-3");
    // After unsubscribe, no new tokens should be received
    assert.strictEqual(receivedTokens.length, 2);
    assert.deepStrictEqual(receivedTokens, ["token-1", "token-2"]);
  });

  it("should deregister global listener callback when unsubscribe is invoked", () => {
    const manager = new StreamTapManager();
    const received: string[] = [];

    const unsubscribe = manager.tap((event) => {
      received.push(event.token);
    });

    manager.emitToken("task-a", "token-a");
    assert.strictEqual(received.length, 1);

    unsubscribe();

    manager.emitToken("task-b", "token-b");
    assert.strictEqual(received.length, 1);
  });
});
