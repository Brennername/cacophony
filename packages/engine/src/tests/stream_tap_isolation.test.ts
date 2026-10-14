import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { StreamTapManager } from "../inference/StreamTapManager.js";

describe("T97.4.4: StreamTapManager Multi-Task Buffer and Stream Isolation", () => {
  it("should ensure tokens appended to task-1 are never visible in task-2 buffer", () => {
    const manager = new StreamTapManager();
    const task1 = "task-alpha";
    const task2 = "task-beta";

    manager.emitToken(task1, "token-alpha-1");
    manager.emitToken(task1, "token-alpha-2");

    manager.emitToken(task2, "token-beta-1");

    assert.strictEqual(manager.getBuffer(task1), "token-alpha-1token-alpha-2");
    assert.strictEqual(manager.getBuffer(task2), "token-beta-1");
    assert.ok(!manager.getBuffer(task2).includes("alpha"));
    assert.ok(!manager.getBuffer(task1).includes("beta"));
  });

  it("should isolate task-scoped event listeners so task-1 listeners receive only task-1 tokens", () => {
    const manager = new StreamTapManager();
    const task1 = "task-alpha";
    const task2 = "task-beta";

    const task1Tokens: string[] = [];
    const task2Tokens: string[] = [];

    manager.tap((ev) => task1Tokens.push(ev.token), task1);
    manager.tap((ev) => task2Tokens.push(ev.token), task2);

    manager.emitToken(task1, "msg-1");
    manager.emitToken(task2, "msg-2");
    manager.emitToken(task1, "msg-3");

    assert.deepStrictEqual(task1Tokens, ["msg-1", "msg-3"]);
    assert.deepStrictEqual(task2Tokens, ["msg-2"]);
  });
});
