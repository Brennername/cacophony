import { describe, it } from "node:test";
import assert from "node:assert";
import { ReasoningDistillationService } from "../inference/ReasoningDistillationService.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";

describe("ReasoningDistillationService Suite", () => {
  it("should extract structured opinion with heuristic distiller when no LLM provider is present", async () => {
    const service = new ReasoningDistillationService();
    const rawTranscript = `
We need to design a clean queue groomer.
- Decide to enforce strict FIFO ordering
- Decide to prune stalled tasks after 15 minutes
Risk: Watchdog timeouts may trigger on slow cold-starts
Edge case: Memory exhaustion if queue grows unbounded
`;

    const opinion = await service.distillOpinion(rawTranscript);

    assert.ok(opinion.summary.length > 0);
    assert.strictEqual(opinion.keyDecisions.length >= 2, true);
    assert.strictEqual(opinion.identifiedRisks.length >= 1, true);
    assert.strictEqual(opinion.confidenceScore >= 0.8, true);
    assert.ok(opinion.keyDecisions.some((d) => d.includes("strict FIFO ordering")));
    assert.ok(opinion.identifiedRisks.some((r) => r.includes("Watchdog timeouts")));
  });

  it("should return fallback record for empty reasoning transcript", async () => {
    const service = new ReasoningDistillationService();
    const opinion = await service.distillOpinion("   ");

    assert.strictEqual(opinion.summary, "No cognitive reasoning trace recorded.");
    assert.strictEqual(opinion.keyDecisions.length, 0);
    assert.strictEqual(opinion.identifiedRisks.length, 0);
    assert.strictEqual(opinion.confidenceScore, 0.5);
  });

  it("should parse LLM JSON responses when inference provider is available", async () => {
    const mockProvider: IInferenceProvider = {
      getProviderType: () => "ollama",
      generate: async () => ({
        content: JSON.stringify({
          summary: "Implements decoupled worktree isolation for concurrency.",
          keyDecisions: ["Use worktree add -B", "Track lockfiles in worktree"],
          identifiedRisks: ["Git index lock collision"],
          confidenceScore: 0.95
        }),
        model: "qwen2.5-coder:7b",
        tokensPrompt: 100,
        tokensCompletion: 40,
        totalTokens: 140,
        durationMs: 120,
        latencyMs: 120,
        tokensPerSec: 33.3
      }),
      stream: async () => {
        throw new Error("Not implemented");
      }
    };

    const service = new ReasoningDistillationService(mockProvider);
    const opinion = await service.distillOpinion("raw reasoning here...");

    assert.strictEqual(opinion.summary, "Implements decoupled worktree isolation for concurrency.");
    assert.strictEqual(opinion.keyDecisions.length, 2);
    assert.strictEqual(opinion.identifiedRisks[0], "Git index lock collision");
    assert.strictEqual(opinion.confidenceScore, 0.95);
  });
});
