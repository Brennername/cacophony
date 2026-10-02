import { describe, it } from "node:test";
import assert from "node:assert";
import { ReasoningStreamDemuxer } from "../inference/ReasoningStreamDemuxer.js";
import { StreamTapManager } from "../inference/StreamTapManager.js";

describe("ReasoningStreamDemuxer & Dual-Channel StreamTap", () => {
  it("should separate cognitive <think> trace from code chunks cleanly", () => {
    const demuxer = new ReasoningStreamDemuxer();
    const rawTokens = [
      "<think>",
      "\nFirst, we need to inspect the input array.\n",
      "We will sort it using quicksort.\n",
      "</think>",
      "\nexport function sort(arr: number[]): number[] {\n",
      "  return arr.slice().sort((a, b) => a - b);\n",
      "}\n"
    ];

    const allChunks: Array<{ type: string; content: string }> = [];
    for (const token of rawTokens) {
      allChunks.push(...demuxer.feed(token));
    }
    allChunks.push(...demuxer.flush());

    const reasoningChunks = allChunks.filter((c) => c.type === "reasoning");
    const codeChunks = allChunks.filter((c) => c.type === "code");

    assert.ok(reasoningChunks.length > 0);
    assert.ok(codeChunks.length > 0);

    const fullReasoning = demuxer.getAccumulatedReasoning();
    const fullCode = demuxer.getAccumulatedCode();

    assert.ok(fullReasoning.includes("First, we need to inspect the input array."));
    assert.ok(fullReasoning.includes("We will sort it using quicksort."));
    assert.strictEqual(fullReasoning.includes("<think>"), false);
    assert.strictEqual(fullReasoning.includes("</think>"), false);

    assert.ok(fullCode.includes("export function sort"));
    assert.strictEqual(fullCode.includes("<think>"), false);
  });

  it("should handle split tags across chunk boundaries without leaking tags", () => {
    const demuxer = new ReasoningStreamDemuxer();
    const fragmentedTokens = [
      "<th",
      "ink>",
      "Anal",
      "yzing problem",
      "</th",
      "ink>",
      "console",
      ".log('done');"
    ];

    for (const tok of fragmentedTokens) {
      demuxer.feed(tok);
    }
    demuxer.flush();

    assert.strictEqual(demuxer.getAccumulatedReasoning(), "Analyzing problem");
    assert.strictEqual(demuxer.getAccumulatedCode(), "console.log('done');");
  });

  it("should not confuse markdown code blocks inside <think> tags with executable code", () => {
    const demuxer = new ReasoningStreamDemuxer();
    demuxer.feed("<think>\nLet us consider this snippet:\n```typescript\nconst temp = 1;\n```\n</think>\nconst realCode = 2;");
    demuxer.flush();

    const reasoning = demuxer.getAccumulatedReasoning();
    const code = demuxer.getAccumulatedCode();

    assert.ok(reasoning.includes("const temp = 1;"));
    assert.strictEqual(code.trim(), "const realCode = 2;");
    assert.strictEqual(code.includes("const temp = 1;"), false);
  });

  it("should broadcast reasoning_chunk and code_chunk events over StreamTapManager", () => {
    const tap = new StreamTapManager();
    const receivedReasoning: string[] = [];
    const receivedCode: string[] = [];

    tap.tapReasoning((e) => {
      receivedReasoning.push(e.chunk);
    });

    tap.tapCode((e) => {
      receivedCode.push(e.chunk);
    });

    const taskId = "task-cognitive-test";
    tap.emitToken(taskId, "<think>Thinking through strategy...</think>function solution() {}");

    assert.ok(receivedReasoning.length > 0);
    assert.ok(receivedCode.length > 0);
    assert.strictEqual(receivedReasoning.join(""), "Thinking through strategy...");
    assert.strictEqual(receivedCode.join(""), "function solution() {}");

    assert.strictEqual(tap.getReasoningTranscript(taskId), "Thinking through strategy...");
    assert.strictEqual(tap.getDemuxedCode(taskId), "function solution() {}");
  });

  it("should cleanly strip orphan </think> tags without leaking into code or reasoning", () => {
    const demuxer = new ReasoningStreamDemuxer();
    demuxer.feed("const a = 1;\n</think>\nconst b = 2;");
    demuxer.flush();

    assert.strictEqual(demuxer.getAccumulatedReasoning(), "");
    assert.strictEqual(demuxer.getAccumulatedCode(), "const a = 1;\n\nconst b = 2;");
    assert.strictEqual(demuxer.getAccumulatedCode().includes("</think>"), false);
  });
});
