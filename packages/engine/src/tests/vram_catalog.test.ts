import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ModelVramCatalog,
  MODEL_VRAM_TABLE,
} from "../hardware/ModelVramCatalog.js";

describe("ModelVramCatalog Unit Tests (T68.1)", () => {
  it("verifies static MODEL_VRAM_TABLE baseline footprints", () => {
    assert.equal(MODEL_VRAM_TABLE["qwen2.5-coder:3b"]?.baseFootprintGb, 2.2);
    assert.equal(MODEL_VRAM_TABLE["gemma3:4b"]?.baseFootprintGb, 3.1);
    assert.equal(MODEL_VRAM_TABLE["qwen2.5-coder:7b"]?.baseFootprintGb, 5.2);
    assert.equal(MODEL_VRAM_TABLE["deepseek-r1:8b"]?.baseFootprintGb, 6.1);
  });

  it("retrieves baseline footprint and profile for known models", () => {
    const catalog = new ModelVramCatalog();

    const profile7b = catalog.getProfile("qwen2.5-coder:7b");
    assert.ok(profile7b);
    assert.equal(profile7b.baseFootprintGb, 5.2);
    assert.equal(profile7b.baseFootprintMb, 5325);
    assert.equal(catalog.getVramForModel("qwen2.5-coder:7b"), 5.2);

    const profile3b = catalog.getProfile("qwen2.5-coder:3b");
    assert.ok(profile3b);
    assert.equal(profile3b.baseFootprintGb, 2.2);
    assert.equal(profile3b.baseFootprintMb, 2253);

    const profile8b = catalog.getProfile("deepseek-r1:8b");
    assert.ok(profile8b);
    assert.equal(profile8b.baseFootprintGb, 6.1);
    assert.equal(profile8b.baseFootprintMb, 6246);
  });

  it("matches model variants and quantized tag strings via substring resolution", () => {
    const catalog = new ModelVramCatalog();

    const resolved = catalog.getProfile("qwen2.5-coder:7b-instruct-q4_K_M");
    assert.ok(resolved);
    assert.equal(resolved.modelId, "qwen2.5-coder:7b");
    assert.equal(resolved.baseFootprintGb, 5.2);
  });

  it("calculates dynamic total VRAM scaling by context window KV-cache size", () => {
    const catalog = new ModelVramCatalog();

    // qwen2.5-coder:7b baseMb = 5325, kvCachePer1kTokensMb = 128
    // Context 4096 tokens: 5325 + (4096 / 1024) * 128 = 5325 + 512 = 5837 MB
    const total4096 = catalog.estimateTotalVramMb("qwen2.5-coder:7b", 4096);
    assert.equal(total4096, 5837);

    // Context 8192 tokens: 5325 + (8192 / 1024) * 128 = 5325 + 1024 = 6349 MB
    const total8192 = catalog.estimateTotalVramMb("qwen2.5-coder:7b", 8192);
    assert.equal(total8192, 6349);

    assert.ok(
      total8192 > total4096,
      "8192 token context must require more VRAM than 4096 token context",
    );
    assert.equal(total8192 - total4096, 512);
  });

  it("supports custom profile registration and removal", () => {
    const catalog = new ModelVramCatalog();

    catalog.registerProfile({
      modelId: "custom-coder:14b",
      baseFootprintGb: 9.5,
      baseFootprintMb: 9728,
      kvCachePer1kTokensMb: 256,
    });

    assert.equal(catalog.getVramForModel("custom-coder:14b"), 9.5);
    assert.equal(catalog.estimateTotalVramMb("custom-coder:14b", 2048), 9728 + 512);

    const removed = catalog.removeProfile("custom-coder:14b");
    assert.equal(removed, true);
    assert.equal(catalog.getProfile("custom-coder:14b"), undefined);
  });

  it("gracefully falls back to default profile for unknown models", () => {
    const catalog = new ModelVramCatalog();

    assert.equal(catalog.getProfile("completely-unknown-model"), undefined);
    assert.equal(catalog.getVramForModel("completely-unknown-model"), undefined);

    // estimateTotalVramMb uses default fallback (4096 MB base + kv overhead)
    const fallbackEstimate = catalog.estimateTotalVramMb("completely-unknown-model", 4096);
    assert.equal(fallbackEstimate, 4096 + 400); // 4096 + 4 * 100
  });
});
