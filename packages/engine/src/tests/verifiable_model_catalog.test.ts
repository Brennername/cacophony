import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VerifiableModelCatalog } from "../hardware/VerifiableModelCatalog.js";

describe("VerifiableModelCatalog & Multi-Provider Roster Suite (T-S9.4)", () => {
  it("should return curated model catalog entries across Ollama, local engines, and Frontier APIs", () => {
    const all = VerifiableModelCatalog.getAll();
    assert.ok(all.length >= 10, "Catalog should have at least 10 curated models");

    // Local Ollama models
    const phi4 = VerifiableModelCatalog.findByTag("phi4:latest");
    assert.ok(phi4);
    assert.equal(phi4.provider, "ollama");
    assert.equal(phi4.parameterSize, 14);
    assert.equal(phi4.isFrontier, false);

    const deepseekCoder = VerifiableModelCatalog.findByTag("deepseek-coder-v2:16b");
    assert.ok(deepseekCoder);
    assert.equal(deepseekCoder.provider, "ollama");
    assert.equal(deepseekCoder.parameterSize, 16);

    // Frontier Cloud models
    const claudeSonnet = VerifiableModelCatalog.findByTag("claude-3-5-sonnet-20241022");
    assert.ok(claudeSonnet);
    assert.equal(claudeSonnet.provider, "anthropic");
    assert.equal(claudeSonnet.isFrontier, true);
    assert.equal(claudeSonnet.isCloudApi, true);

    const gpt4o = VerifiableModelCatalog.findByTag("gpt-4o");
    assert.ok(gpt4o);
    assert.equal(gpt4o.provider, "openai");
    assert.equal(gpt4o.isFrontier, true);

    const deepseekV3 = VerifiableModelCatalog.findByTag("deepseek-ai/DeepSeek-V3");
    assert.ok(deepseekV3);
    assert.equal(deepseekV3.provider, "deepseek");
    assert.equal(deepseekV3.isFrontier, true);
  });

  it("should filter catalog entries by provider correctly", () => {
    const ollamaModels = VerifiableModelCatalog.getByProvider("ollama");
    assert.ok(ollamaModels.length >= 5);
    for (const m of ollamaModels) {
      assert.equal(m.provider, "ollama");
    }

    const anthropicModels = VerifiableModelCatalog.getByProvider("anthropic");
    assert.ok(anthropicModels.length >= 2);
    for (const m of anthropicModels) {
      assert.equal(m.provider, "anthropic");
    }
  });

  it("should partition catalog between frontier cloud models and local offline models", () => {
    const frontier = VerifiableModelCatalog.getFrontierModels();
    assert.ok(frontier.length >= 4);
    for (const m of frontier) {
      assert.equal(m.isFrontier, true);
    }

    const local = VerifiableModelCatalog.getLocalModels();
    assert.ok(local.length >= 5);
    for (const m of local) {
      assert.equal(m.isFrontier, false);
      assert.equal(m.isCloudApi, false);
    }
  });
});
