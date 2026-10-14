import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FrontierFallbackRouter,
  type SchematicFallbackRequest,
} from "../inference/FrontierFallbackRouter.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";
import type {
  InferenceRequest,
  InferenceResponse,
  InferenceProviderType,
} from "@cacophony/shared-types";

class MockProvider implements IInferenceProvider {
  public callCount = 0;
  public lastRequest?: InferenceRequest;

  constructor(
    public readonly name: string,
    public readonly providerType: InferenceProviderType = "openai",
    private readonly shouldFail = false,
    private readonly failMessage = "Provider failed",
    private readonly responseText = "Mock response",
  ) {}

  public getProviderType(): InferenceProviderType {
    return this.providerType;
  }

  public async generate(request: InferenceRequest): Promise<InferenceResponse> {
    this.callCount++;
    this.lastRequest = request;
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }
    return {
      model: request.model,
      content: this.responseText,
      tokensPrompt: 50,
      tokensCompletion: 25,
      totalTokens: 75,
      latencyMs: 100,
      tokensPerSec: 30,
    };
  }

  public async stream(
    request: InferenceRequest,
    onChunk: (chunk: string) => void,
  ): Promise<InferenceResponse> {
    this.callCount++;
    this.lastRequest = request;
    if (this.shouldFail) {
      throw new Error(this.failMessage);
    }
    onChunk(this.responseText);
    return {
      model: request.model,
      content: this.responseText,
      tokensPrompt: 50,
      tokensCompletion: 25,
      totalTokens: 75,
      latencyMs: 100,
      tokensPerSec: 30,
    };
  }
}

describe("FrontierFallbackRouter", () => {
  it("dispatches requests to the highest priority provider", async () => {
    const router = new FrontierFallbackRouter("deepseek-r1:8b");
    const p1 = new MockProvider("p1", "anthropic", false, "", "P1 output");
    const p2 = new MockProvider("p2", "openai", false, "", "P2 output");

    router.registerProvider({ providerType: "anthropic", provider: p1, priority: 1 });
    router.registerProvider({ providerType: "openai", provider: p2, priority: 2 });

    const response = await router.generate({
      model: "claude-3-5-sonnet",
      messages: [{ role: "user", content: "test" }],
    });

    assert.equal(response.content, "P1 output");
    assert.equal(p1.callCount, 1);
    assert.equal(p2.callCount, 0);
  });

  it("transparently falls back to secondary provider when primary trips circuit breaker", async () => {
    const router = new FrontierFallbackRouter("deepseek-r1:8b");
    const failingP1 = new MockProvider("p1", "anthropic", true, "429 Rate limit exceeded");
    const workingP2 = new MockProvider("p2", "openai", false, "", "P2 fallback output");

    router.registerProvider({ providerType: "anthropic", provider: failingP1, priority: 1 });
    router.registerProvider({ providerType: "openai", provider: workingP2, priority: 2 });

    const response = await router.generate({
      model: "claude-3-5-sonnet",
      messages: [{ role: "user", content: "test" }],
    });

    assert.equal(response.content, "P2 fallback output");
    assert.equal(failingP1.callCount, 1);
    assert.equal(workingP2.callCount, 1);
  });

  it("tracks token usage in TokenQuotaTracker", async () => {
    const router = new FrontierFallbackRouter("deepseek-r1:8b");
    const provider = new MockProvider("p1", "openai", false, "", "test result");

    router.registerProvider({ providerType: "openai", provider, priority: 1 });

    await router.generate({
      model: "gpt-4o",
      messages: [{ role: "user", content: "test prompt" }],
    });

    const tracker = router.getQuotaTracker();
    const usage = tracker.getUsage("openai");
    assert.equal(usage.tokensPrompt, 50);
    assert.equal(usage.tokensCompletion, 25);
  });

  it("routeSchematicFallback rejects when consecutiveFailures < 2", async () => {
    const router = new FrontierFallbackRouter("deepseek-r1:8b");
    const provider = new MockProvider("p1", "openai", false, "", "output");
    router.registerProvider({ providerType: "openai", provider, priority: 1 });

    const spec: SchematicFallbackRequest = {
      taskDescription: "Implement sample method",
      schematicCode: "export class Test {}",
      targetFile: "test.ts",
      consecutiveFailures: 1,
    };

    await assert.rejects(
      async () => router.routeSchematicFallback(spec),
      /consecutive slot-fill failures \(1\) does not meet the escalation threshold \(2\)/i,
    );
  });

  it("routeSchematicFallback escalates to frontier model when consecutiveFailures >= 2", async () => {
    const router = new FrontierFallbackRouter("deepseek-r1:8b");
    const provider = new MockProvider("frontier-primary", "anthropic", false, "", "export class Test { execute() {} }");
    router.registerProvider({ providerType: "anthropic", provider, priority: 1 });

    const spec: SchematicFallbackRequest = {
      taskDescription: "Implement execute method",
      schematicCode: "export class Test {\n  /* AST_METHOD_STUB: execute */\n}",
      targetFile: "packages/engine/src/services/Test.ts",
      consecutiveFailures: 2,
    };

    const response = await router.routeSchematicFallback(spec);

    assert.equal(response.content, "export class Test { execute() {} }");
    assert.equal(provider.callCount, 1);
    assert.ok(provider.lastRequest);
    const content = provider.lastRequest.messages[0]?.content || "";
    assert.ok(content.includes("[FRONTIER SCHEMATIC FALLBACK ESCALATION]"));
    assert.ok(content.includes("packages/engine/src/services/Test.ts"));
    assert.ok(content.includes("AST_METHOD_STUB: execute"));
  });
});
