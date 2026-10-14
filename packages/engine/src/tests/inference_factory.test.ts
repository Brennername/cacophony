import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { InferenceProviderFactory } from "../inference/InferenceProviderFactory.js";
import { OllamaProvider } from "../inference/OllamaProvider.js";
import { OpenAICompatibleInferenceProvider } from "../inference/OpenAICompatibleInferenceProvider.js";
import { MockInferenceStreamProvider } from "../inference/MockInferenceStreamProvider.js";

describe("InferenceProviderFactory (T71.2.3)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.INFERENCE_PROVIDER;
    delete process.env.INFERENCE_BASE_URL;
    delete process.env.INFERENCE_API_KEY;
    delete process.env.DEMO_MODE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should create OllamaProvider by default when no environment variables are set", () => {
    const provider = InferenceProviderFactory.createProvider();
    assert.ok(provider instanceof OllamaProvider);
    assert.equal(provider.getProviderType(), "ollama");
  });

  it("should create OpenAICompatibleInferenceProvider when INFERENCE_PROVIDER is openai_compatible", () => {
    process.env.INFERENCE_PROVIDER = "openai_compatible";
    process.env.INFERENCE_BASE_URL = "http://127.0.0.1:8000/v1";
    process.env.INFERENCE_API_KEY = "test-key-123";

    const provider = InferenceProviderFactory.createProvider();
    assert.ok(provider instanceof OpenAICompatibleInferenceProvider);
  });

  it("should create MockInferenceStreamProvider when DEMO_MODE is true", () => {
    process.env.DEMO_MODE = "true";

    const provider = InferenceProviderFactory.createProvider();
    assert.ok(provider instanceof MockInferenceStreamProvider);
  });

  it("should prioritize explicit config over environment variables", () => {
    process.env.INFERENCE_PROVIDER = "ollama";

    const provider = InferenceProviderFactory.createProvider({
      provider: "openai_compatible",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "custom-key",
    });

    assert.ok(provider instanceof OpenAICompatibleInferenceProvider);
  });

  it("should throw descriptive error when unsupported provider is requested", () => {
    process.env.INFERENCE_PROVIDER = "invalid_llm";

    assert.throws(
      () => InferenceProviderFactory.createProvider(),
      /Unsupported inference provider: 'invalid_llm'/,
    );
  });

  it("should support instance invocation createProvider", () => {
    const factory = new InferenceProviderFactory();
    const provider = factory.createProvider({ provider: "ollama" });
    assert.ok(provider instanceof OllamaProvider);
  });
});
