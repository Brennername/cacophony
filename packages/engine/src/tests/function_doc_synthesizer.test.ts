import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CommentRerollPromptFactory } from "../inference/CommentRerollPromptFactory.js";
import { FunctionDocSynthesizer } from "../inference/FunctionDocSynthesizer.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";
import type { InferenceRequest, InferenceResponse } from "@cacophony/shared-types";
import { FunctionAstLocator } from "../ast/FunctionAstLocator.js";

describe("CommentRerollPromptFactory & FunctionDocSynthesizer", () => {
  const locator = new FunctionAstLocator();

  const sourceCode = `
export class PaymentGateway {
  public async authorizeTransaction(amount: number, currency: string): Promise<boolean> {
    if (amount <= 0) return false;
    return true;
  }
}
`.trim();

  it("should create constrained prompts containing function signature, parameters, and body", () => {
    const boundary = locator.findFunctionByName(sourceCode, "authorizeTransaction", "payment.ts")!;
    assert.ok(boundary);

    const prompts = CommentRerollPromptFactory.createPrompt({
      boundary,
      functionBodyText: "if (amount <= 0) return false;\nreturn true;",
    });

    assert.ok(prompts.systemPrompt.includes("CRITICAL CONSTRAINTS"));
    assert.ok(prompts.systemPrompt.includes("You CANNOT and MUST NOT edit, reproduce, or output any function implementation code"));
    assert.ok(prompts.userPrompt.includes("Target Function: authorizeTransaction"));
    assert.ok(prompts.userPrompt.includes("Parameters:"));
    assert.ok(prompts.userPrompt.includes("amount (number)"));
    assert.ok(prompts.userPrompt.includes("currency (string)"));
    assert.ok(prompts.userPrompt.includes("Return Type: Promise<boolean>"));
  });

  it("should append previous draft and operator feedback when guidance is provided", () => {
    const boundary = locator.findFunctionByName(sourceCode, "authorizeTransaction", "payment.ts")!;
    const prompts = CommentRerollPromptFactory.createPrompt({
      boundary,
      functionBodyText: "if (amount <= 0) return false;\nreturn true;",
      previousDraft: "/** Authorizes a transaction. */",
      userGuidance: "little less fluff, explain the decoupling and why it's necessary",
    });

    assert.ok(prompts.userPrompt.includes("--- Previous Draft Variant ---"));
    assert.ok(prompts.userPrompt.includes("/** Authorizes a transaction. */"));
    assert.ok(prompts.userPrompt.includes("--- Operator Reroll Revision Guidance ---"));
    assert.ok(prompts.userPrompt.includes("little less fluff, explain the decoupling and why it's necessary"));
  });

  it("should synthesize doc comment and sanitize raw markdown output", async () => {
    const mockInference: IInferenceProvider = {
      getProviderType: () => "ollama",
      generate: mock.fn(async (_req: InferenceRequest): Promise<InferenceResponse> => {
        return {
          content: [
            "```typescript",
            "/**",
            " * Authorizes payments against the merchant network.",
            " * Decouples transaction validation from order fulfillment.",
            " * @param amount Numeric payment sum",
            " * @param currency ISO currency code",
            " * @returns Promise resolving to authorization status",
            " */",
            "```"
          ].join("\n"),
          model: "qwen2.5-coder:7b-instruct-q4_K_M",
          tokensPrompt: 100,
          tokensCompletion: 42,
          totalTokens: 142,
          latencyMs: 1200,
          tokensPerSec: 25,
        };
      }),
      stream: mock.fn(),
    };

    const synthesizer = new FunctionDocSynthesizer(mockInference, locator);
    const candidate = await synthesizer.synthesizeDocComment({
      filePath: "payment.ts",
      functionName: "authorizeTransaction",
      sourceContent: sourceCode,
      userGuidance: "explain the decoupling",
    });

    assert.ok(candidate.id.startsWith("doc-"));
    assert.strictEqual(candidate.functionIdentifier, "authorizeTransaction");
    assert.strictEqual(candidate.status, "PENDING");
    assert.ok(candidate.candidateText.startsWith("/**"));
    assert.ok(candidate.candidateText.endsWith("*/"));
    assert.strictEqual(candidate.candidateText.includes("```"), false);
    assert.ok(candidate.candidateText.includes("Decouples transaction validation from order fulfillment"));
  });
});
