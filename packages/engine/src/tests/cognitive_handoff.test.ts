import test from "node:test";
import assert from "node:assert/strict";
import { CognitiveHandoffCoordinator } from "../inference/CognitiveHandoffCoordinator.js";
import { ReasoningDistillationService } from "../inference/ReasoningDistillationService.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";
import type { InferenceRequest, InferenceResponse } from "@cacophony/shared-types";

function createDummyResponse(content = "", tokensPerSec = 0): InferenceResponse {
  return {
    content,
    model: "dummy-model",
    tokensPrompt: 10,
    tokensCompletion: 10,
    totalTokens: 20,
    latencyMs: 100,
    tokensPerSec
  };
}

test("CognitiveHandoffCoordinator Suite", async (t) => {
  await t.test("formats actionable implementation brief from distilled opinion", () => {
    const mockProvider: IInferenceProvider = {
      getProviderType: () => "ollama",
      generate: async () => createDummyResponse(),
      stream: async () => createDummyResponse()
    };

    const coordinator = new CognitiveHandoffCoordinator(mockProvider);
    const brief = coordinator.formatImplementationBrief(
      {
        summary: "Use a factory pattern to isolate drivers.",
        keyDecisions: ["Create DriverFactory", "Refactor connect method"],
        identifiedRisks: ["Stale connection leak"],
        confidenceScore: 0.95
      },
      "Add DriverFactory for PostgreSQL",
      ["src/DriverFactory.ts"],
      ["Rule: do not use emojis", "Rule: strict typescript"]
    );

    assert.ok(brief.includes("=== ARCHITECTURAL SPECIFICATION & REASONING SUMMARY ==="));
    assert.ok(brief.includes("Executive Summary: Use a factory pattern to isolate drivers."));
    assert.ok(brief.includes("Create DriverFactory"));
    assert.ok(brief.includes("Stale connection leak"));
    assert.ok(brief.includes("=== TARGET TASK OBJECTIVE ==="));
    assert.ok(brief.includes("Add DriverFactory for PostgreSQL"));
    assert.ok(brief.includes("Rule: do not use emojis"));
    assert.ok(brief.includes("=== INSTRUCTIONS FOR IMPLEMENTER ==="));
  });

  await t.test("executes handoff by distilling reasoning trace and dispatching to implementer model", async () => {
    let calledWithPrompt = "";
    const mockProvider: IInferenceProvider = {
      getProviderType: () => "ollama",
      generate: async (req: InferenceRequest): Promise<InferenceResponse> => {
        calledWithPrompt = req.messages[0]?.content || "";
        return {
          content: "```typescript\nexport class DriverFactory {}\n```",
          model: "qwen2.5-coder:7b-instruct-q4_K_M",
          tokensPerSec: 42,
          tokensPrompt: 120,
          tokensCompletion: 35,
          totalTokens: 155,
          latencyMs: 800
        };
      },
      stream: async () => createDummyResponse()
    };

    const distillation = new ReasoningDistillationService();
    const coordinator = new CognitiveHandoffCoordinator(mockProvider, distillation);

    const rawReasoning = `
I need to implement DriverFactory.
We decide to export a class DriverFactory.
Risk: memory leaks if we don't clean up.
`;

    const result = await coordinator.executeHandoff({
      reasonerModel: "deepseek-r1:8b",
      implementerModel: "qwen2.5-coder:7b-instruct-q4_K_M",
      rawReasoningTranscript: rawReasoning,
      originalTaskPrompt: "Implement DriverFactory",
      focusFiles: ["src/DriverFactory.ts"],
      directives: ["Strict TypeScript"]
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.reasonerModel, "deepseek-r1:8b");
    assert.strictEqual(result.implementerModel, "qwen2.5-coder:7b-instruct-q4_K_M");
    assert.ok(result.opinion.keyDecisions.length > 0);
    assert.ok(result.code.includes("export class DriverFactory"));
    assert.ok(calledWithPrompt.includes("=== ARCHITECTURAL SPECIFICATION"));
  });

  await t.test("streams output through onChunk callback when streaming is supported", async () => {
    const chunks: string[] = [];
    const mockProvider: IInferenceProvider = {
      getProviderType: () => "ollama",
      generate: async () => createDummyResponse(),
      stream: async (_req, onChunk): Promise<InferenceResponse> => {
        if (onChunk) {
          onChunk("```typescript\n");
          onChunk("const x = 1;\n");
          onChunk("```");
        }
        return {
          content: "```typescript\nconst x = 1;\n```",
          model: "qwen2.5-coder:7b-instruct-q4_K_M",
          tokensPerSec: 50,
          tokensPrompt: 50,
          tokensCompletion: 15,
          totalTokens: 65,
          latencyMs: 300
        };
      }
    };

    const coordinator = new CognitiveHandoffCoordinator(mockProvider);

    const result = await coordinator.executeHandoff({
      reasonerModel: "deepseek-r1:8b",
      implementerModel: "qwen2.5-coder:7b-instruct-q4_K_M",
      rawReasoningTranscript: "We should define x as 1.",
      originalTaskPrompt: "Define variable x",
      focusFiles: ["src/index.ts"],
      directives: [],
      onChunk: (c) => chunks.push(c)
    });

    assert.strictEqual(result.success, true);
    assert.ok(chunks.join("").includes("const x = 1;"));
  });
});
