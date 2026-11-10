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
      "}\n",
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

    assert.ok(
      fullReasoning.includes("First, we need to inspect the input array."),
    );
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
      ".log('done');",
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
    demuxer.feed(
      "<think>\nLet us consider this snippet:\n```typescript\nconst temp = 1;\n```\n</think>\nconst realCode = 2;",
    );
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
    tap.emitToken(
      taskId,
      "<think>Thinking through strategy...</think>function solution() {}",
    );

    assert.ok(receivedReasoning.length > 0);
    assert.ok(receivedCode.length > 0);
    assert.strictEqual(
      receivedReasoning.join(""),
      "Thinking through strategy...",
    );
    assert.strictEqual(receivedCode.join(""), "function solution() {}");

    assert.strictEqual(
      tap.getReasoningTranscript(taskId),
      "Thinking through strategy...",
    );
    assert.strictEqual(tap.getDemuxedCode(taskId), "function solution() {}");
  });

  it("should cleanly strip orphan </think> tags without leaking into code or reasoning", () => {
    const demuxer = new ReasoningStreamDemuxer();
    demuxer.feed("const a = 1;\n</think>\nconst b = 2;");
    demuxer.flush();

    assert.strictEqual(demuxer.getAccumulatedReasoning(), "");
    assert.strictEqual(
      demuxer.getAccumulatedCode(),
      "const a = 1;\n\nconst b = 2;",
    );
    assert.strictEqual(
      demuxer.getAccumulatedCode().includes("</think>"),
      false,
    );
  });

  it("should recognize case-insensitive <Think> and <thought> tags", () => {
    const demuxer = new ReasoningStreamDemuxer();
    demuxer.feed("<Think>Cognitive step 1</Think>export const val = 42;");
    demuxer.flush();

    assert.strictEqual(demuxer.getAccumulatedReasoning(), "Cognitive step 1");
    assert.strictEqual(demuxer.getAccumulatedCode(), "export const val = 42;");

    const thoughtDemuxer = new ReasoningStreamDemuxer();
    thoughtDemuxer.feed("<thought>Deep contemplation</thought>const x = 10;");
    thoughtDemuxer.flush();

    assert.strictEqual(thoughtDemuxer.getAccumulatedReasoning(), "Deep contemplation");
    assert.strictEqual(thoughtDemuxer.getAccumulatedCode(), "const x = 10;");
  });

  it("should flush remaining pending buffer on stream close via StreamTapManager", () => {
    const tap = new StreamTapManager();
    const taskId = "task-flush-test";
    const codeChunks: string[] = [];
    tap.tapCode((e) => {
      codeChunks.push(e.chunk);
    }, taskId);

    // Feed token ending with '<' (prefix of <think>)
    tap.emitToken(taskId, "const isSmaller = a <");
    // Flush should emit the held '<'
    tap.flush(taskId);

    assert.strictEqual(codeChunks.join(""), "const isSmaller = a <");
  });

  it("should demux pre-code cognitive preamble and post-code explanation into reasoning when using triple backtick (```) code fences", () => {
    const demuxer = new ReasoningStreamDemuxer();
    const tokens = [
      "To implement the `Dynamic Context Window Autoscaler` functionality, we need to modify the test file.\n",
      "Below is a complete rewrite of the test file with the necessary logic.\n\n",
      "```ts\n",
      "import { describe, it } from 'node:test';\n",
      "import assert from 'node:assert/strict';\n\n",
      "describe('Autoscaler', () => {\n",
      "  it('should autoscale context', () => {\n",
      "    assert.ok(true);\n",
      "  });\n",
      "});\n",
      "```\n",
      "### Explanation:\n",
      "1. Created unit tests for physical memory checking.\n",
      "2. Verified optimal num_ctx calculation.",
    ];

    const reasoningChunks: string[] = [];
    const codeChunks: string[] = [];

    for (const tok of tokens) {
      const chunks = demuxer.feed(tok);
      for (const ch of chunks) {
        if (ch.type === "reasoning") reasoningChunks.push(ch.content);
        if (ch.type === "code") codeChunks.push(ch.content);
      }
    }
    const flushed = demuxer.flush();
    for (const ch of flushed) {
      if (ch.type === "reasoning") reasoningChunks.push(ch.content);
      if (ch.type === "code") codeChunks.push(ch.content);
    }

    const reasoning = demuxer.getAccumulatedReasoning();
    const code = demuxer.getAccumulatedCode();

    // Verify preamble is in reasoning
    assert.ok(
      reasoning.includes(
        "To implement the `Dynamic Context Window Autoscaler` functionality",
      ),
    );
    // Verify postamble explanation is in reasoning
    assert.ok(reasoning.includes("### Explanation:"));
    assert.ok(reasoning.includes("2. Verified optimal num_ctx calculation."));

    // Verify code block contains clean executable code without markdown fences
    assert.ok(code.includes("import { describe, it } from 'node:test';"));
    assert.ok(code.includes("describe('Autoscaler'"));
    assert.strictEqual(code.includes("```"), false);
    assert.strictEqual(
      code.includes("To implement the `Dynamic Context Window Autoscaler`"),
      false,
    );
  });

  it("should demux cognitive preamble, code, and postamble when using triple single-quote (''') code fences", () => {
    const demuxer = new ReasoningStreamDemuxer();
    const tokens = [
      "Here is the targeted implementation using single-quote fences:\n\n",
      "'''typescript\n",
      "export class Autoscaler {\n",
      "  public autoscale(): number { return 8192; }\n",
      "}\n",
      "'''\n",
      "This concludes the autoscaler implementation.",
    ];

    for (const tok of tokens) {
      demuxer.feed(tok);
    }
    demuxer.flush();

    const reasoning = demuxer.getAccumulatedReasoning();
    const code = demuxer.getAccumulatedCode();

    assert.ok(
      reasoning.includes("Here is the targeted implementation using single-quote fences:"),
    );
    assert.ok(reasoning.includes("This concludes the autoscaler implementation."));

    assert.ok(code.includes("export class Autoscaler"));
    assert.ok(code.includes("return 8192;"));
    assert.strictEqual(code.includes("'''"), false);
  });

  it("should handle mixed code fence delimiters (``` and ''') and multiple blocks sequentially", () => {
    const demuxer = new ReasoningStreamDemuxer();
    demuxer.feed("Step 1:\n```ts\nconst step1 = true;\n```\nStep 2:\n'''ts\nconst step2 = true;\n'''\nFinished.");
    demuxer.flush();

    const reasoning = demuxer.getAccumulatedReasoning();
    const code = demuxer.getAccumulatedCode();

    assert.ok(reasoning.includes("Step 1:"));
    assert.ok(reasoning.includes("Step 2:"));
    assert.ok(reasoning.includes("Finished."));

    assert.ok(code.includes("const step1 = true;"));
    assert.ok(code.includes("const step2 = true;"));
    assert.strictEqual(code.includes("Step 1:"), false);
    assert.strictEqual(code.includes("Step 2:"), false);
  });

  it("should demux split chunks across triple single-quote (''') boundaries without leaking fence delimiters into code", () => {
    const demuxer = new ReasoningStreamDemuxer();
    const fragmentedTokens = [
      "Preamble text\n",
      "'",
      "''",
      "ts\n",
      "const secret = 4",
      "2;\n",
      "'",
      "''\n",
      "All done.",
    ];

    for (const tok of fragmentedTokens) {
      demuxer.feed(tok);
    }
    demuxer.flush();

    assert.strictEqual(
      demuxer.getAccumulatedReasoning(),
      "Preamble text\nAll done.",
    );
    assert.strictEqual(
      demuxer.getAccumulatedCode(),
      "const secret = 42;\n",
    );
  });
});
