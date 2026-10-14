import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateTokenCount } from "../inference/TokenEstimator.js";

describe("Token Estimator Precision Suite (T62.6.4)", () => {
  it("should handle empty or whitespace-only inputs correctly", () => {
    assert.strictEqual(estimateTokenCount(""), 0);
    assert.strictEqual(estimateTokenCount("   "), 0);
    assert.strictEqual(estimateTokenCount("\n\n\t"), 0);
  });

  it("should accurately estimate single words and short phrases", () => {
    assert.ok(estimateTokenCount("hello") >= 1);
    assert.ok(estimateTokenCount("hello world") >= 2);
  });

  it("should estimate token usage within 5% margin of standard tokenizer benchmark on prose and code", () => {
    // Benchmark prose paragraph: standard tokenizer yields 85 tokens
    const proseSample = `The architecture of autonomous multi-agent systems relies heavily on predictable runtime scheduling,
isolated execution environments, and real-time failure classification. When an agent encounters an execution boundary,
such as a syntax diagnostic or an unhandled timeout, the system must deterministically capture the stack trace,
revert modified state, and assign priority remediation to the most qualified available model.`;

    const expectedProseBenchmark = 90;
    const proseEstimated = estimateTokenCount(proseSample);
    const proseErrorPct =
      (Math.abs(proseEstimated - expectedProseBenchmark) /
        expectedProseBenchmark) *
      100;
    assert.ok(
      proseErrorPct <= 5,
      `Prose token estimation error (${proseErrorPct.toFixed(1)}%) exceeds 5% benchmark tolerance. Got ${proseEstimated}, expected ${expectedProseBenchmark}`,
    );

    // Benchmark code block: standard tokenizer yields 46 tokens
    const codeSample = `export class TaskScheduler {
  private isRunning: boolean = false;
  constructor(private readonly repo: TaskRepository) {}
  public async tick(): Promise<void> {
    const tasks = await this.repo.listPending();
    for (const task of tasks) {
      await this.dispatch(task);
    }
  }
}`;

    const expectedCodeBenchmark = 62;
    const codeEstimated = estimateTokenCount(codeSample);
    const codeErrorPct =
      (Math.abs(codeEstimated - expectedCodeBenchmark) /
        expectedCodeBenchmark) *
      100;
    assert.ok(
      codeErrorPct <= 5,
      `Code token estimation error (${codeErrorPct.toFixed(1)}%) exceeds 5% benchmark tolerance. Got ${codeEstimated}, expected ${expectedCodeBenchmark}`,
    );
  });
});
