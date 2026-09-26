import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockInferenceStreamProvider } from "../inference/MockInferenceStreamProvider.js";

describe("T71.3: MockInferenceStreamProvider & Synthetic Token Streaming", () => {
  it("should generate synthetic code responses without hardware or model backend", async () => {
    const provider = new MockInferenceStreamProvider(100);
    assert.equal(provider.getProviderType(), "ollama");

    const res = await provider.generate({
      messages: [{ role: "user", content: "Implement autonomous telemetry" }],
      model: "demo-synthetic:7b"
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
        model: "demo-synthetic:7b"
      },
      (chunk) => chunks.push(chunk)
    );

    assert.ok(chunks.length > 5, "Should stream multiple discrete token chunks");
    assert.equal(chunks.join(""), res.content);
    assert.ok(res.tokensPerSec > 0);
  });
});
