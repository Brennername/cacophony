import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockInferenceStreamProvider } from "../inference/MockInferenceStreamProvider.js";

describe("T71.3: MockInferenceStreamProvider & Synthetic Token Streaming", () => {
  it("should generate synthetic code responses without hardware or model backend", async () => {
    const provider = new MockInferenceStreamProvider(100);
    assert.equal(provider.getProviderType(), "ollama");

    const res = await provider.generate({
      messages: [{ role: "user", content: "Implement autonomous telemetry" }],
      model: "demo-synthetic:7b",
    });

    assert.ok(res.content.includes("AutonomousTelemetryService"));
    assert.ok(res.tokensCompletion > 0);
    assert.equal(res.model, "demo-synthetic:7b");
  });

  it("should stream synthetic code chunks with tokens/sec pacing", async () => {
    const provider = new MockInferenceStreamProvider(200);
    const chunks: string[] = [];

    const res = await provider.stream(
      {
        messages: [{ role: "user", content: "Stream synthetic code" }],
        model: "demo-synthetic:7b",
      },
      (chunk) => chunks.push(chunk),
    );

    assert.ok(
      chunks.length > 5,
      "Should stream multiple discrete token chunks",
    );
    assert.equal(chunks.join(""), res.content);
    assert.ok(res.tokensPerSec > 0);
  });

  it("should configure default rate of 11.0 tok/s with burst allowance of 5.5 tok/s", () => {
    const provider = new MockInferenceStreamProvider();
    const rate7b = provider.getTokensPerSecondForModel("qwen2.5-coder:7b");
    assert.equal(rate7b, 11.0);

    const rate3b = provider.getTokensPerSecondForModel("qwen2.5-coder:3b");
    assert.ok(rate3b >= 11.0 && rate3b <= 16.5);

    const rate8b = provider.getTokensPerSecondForModel("deepseek-r1:8b");
    assert.ok(rate8b >= 5.5 && rate8b <= 11.0);
  });
});
