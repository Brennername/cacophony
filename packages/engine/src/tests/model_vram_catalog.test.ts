import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ModelVramCatalog } from "../hardware/ModelVramCatalog.js";

describe("ModelVramCatalog Unit Test Suite (T102.2.2)", () => {
  it("should initialize with default model profiles from static table", () => {
    const catalog = new ModelVramCatalog();
    const profiles = catalog.getAllProfiles();

    assert.ok(profiles.length >= 4);
    assert.ok(catalog.getProfile("qwen2.5-coder:7b"));
    assert.ok(catalog.getProfile("gemma3:4b"));
    assert.ok(catalog.getProfile("qwen2.5-coder:3b"));
    assert.ok(catalog.getProfile("deepseek-r1:8b"));
  });

  it("should resolve exact model matches", () => {
    const catalog = new ModelVramCatalog();
    const profile = catalog.getProfile("qwen2.5-coder:7b");

    assert.ok(profile);
    assert.strictEqual(profile?.modelId, "qwen2.5-coder:7b");
    assert.strictEqual(profile?.baseFootprintGb, 5.2);
    assert.strictEqual(profile?.baseFootprintMb, 5325);
    assert.strictEqual(profile?.kvCachePer1kTokensMb, 128);
  });

  it("should resolve fuzzy tag variations via substring matching", () => {
    const catalog = new ModelVramCatalog();

    // Querying with Ollama quantization tag suffix
    const profileWithTag = catalog.getProfile(
      "qwen2.5-coder:7b-instruct-q4_K_M",
    );
    assert.ok(profileWithTag);
    assert.strictEqual(profileWithTag?.modelId, "qwen2.5-coder:7b");

    const profileGemma = catalog.getProfile("gemma3:4b-it-qat");
    assert.ok(profileGemma);
    assert.strictEqual(profileGemma?.modelId, "gemma3:4b");

    const profileGemma12b = catalog.getProfile("gemma3:12b-it-qat");
    assert.ok(profileGemma12b);
    assert.strictEqual(profileGemma12b?.modelId, "gemma3:12b");
  });

  it("should return base footprint in GB and MB accurately", () => {
    const catalog = new ModelVramCatalog();

    assert.strictEqual(catalog.getVramForModel("qwen2.5-coder:3b"), 2.2);
    assert.strictEqual(catalog.getBaseFootprintMb("qwen2.5-coder:3b"), 2253);

    // Fallback for unknown model
    assert.strictEqual(catalog.getVramForModel("unknown-model-xyz"), undefined);
    assert.strictEqual(catalog.getBaseFootprintMb("unknown-model-xyz"), 4096);
  });

  it("should dynamically calculate total VRAM estimating KV-cache scaling", () => {
    const catalog = new ModelVramCatalog();

    // For qwen2.5-coder:7b: base = 5325 MB, kvCachePer1kTokensMb = 128
    // Context = 4096 tokens (4 * 1024): kvOverhead = (4096 / 1024) * 128 = 512 MB
    // Total = 5325 + 512 = 5837 MB
    const total4k = catalog.estimateTotalVramMb("qwen2.5-coder:7b", 4096);
    assert.strictEqual(total4k, 5837);

    // Context = 8192 tokens (8 * 1024): kvOverhead = 8 * 128 = 1024 MB
    // Total = 5325 + 1024 = 6349 MB
    const total8k = catalog.estimateTotalVramMb("qwen2.5-coder:7b", 8192);
    assert.strictEqual(total8k, 6349);

    // Context = 0 tokens: base only
    const total0 = catalog.estimateTotalVramMb("qwen2.5-coder:7b", 0);
    assert.strictEqual(total0, 5325);

    // Negative tokens should clamp to 0
    const totalNeg = catalog.estimateTotalVramMb("qwen2.5-coder:7b", -500);
    assert.strictEqual(totalNeg, 5325);
  });

  it("should permit registering, querying, and removing custom model profiles", () => {
    const catalog = new ModelVramCatalog();
    const customProfile = {
      modelId: "llama3.2:1b",
      baseFootprintGb: 1.1,
      baseFootprintMb: 1126,
      kvCachePer1kTokensMb: 32,
    };

    catalog.registerProfile(customProfile);
    assert.strictEqual(catalog.getVramForModel("llama3.2:1b"), 1.1);
    assert.strictEqual(catalog.getBaseFootprintMb("llama3.2:1b"), 1126);
    assert.strictEqual(
      catalog.estimateTotalVramMb("llama3.2:1b", 2048),
      1126 + 64,
    );

    const removed = catalog.removeProfile("llama3.2:1b");
    assert.strictEqual(removed, true);
    assert.strictEqual(catalog.getVramForModel("llama3.2:1b"), undefined);
  });

  it("should accept custom profiles via constructor overlay", () => {
    const customProfiles = {
      "phi3:mini": {
        modelId: "phi3:mini",
        baseFootprintGb: 2.5,
        baseFootprintMb: 2560,
        kvCachePer1kTokensMb: 72,
      },
    };

    const catalog = new ModelVramCatalog(customProfiles);
    assert.ok(catalog.getProfile("phi3:mini"));
    assert.strictEqual(catalog.getBaseFootprintMb("phi3:mini"), 2560);
    // Baseline profiles should still exist
    assert.ok(catalog.getProfile("qwen2.5-coder:7b"));
  });

  it("should dynamically estimate model profile from tag parameter size and byte size", () => {
    // 12B model estimation
    const gemma12b = ModelVramCatalog.estimateProfileFromTag("gemma3:12b-it-qat");
    assert.strictEqual(gemma12b.baseFootprintGb, 9.0);
    assert.strictEqual(gemma12b.baseFootprintMb, 9216);
    assert.strictEqual(gemma12b.kvCachePer1kTokensMb, 160);

    // 135M sub-billion model estimation
    const smollm = ModelVramCatalog.estimateProfileFromTag("smollm2:135m");
    assert.strictEqual(smollm.baseFootprintGb, 0.3);
    assert.strictEqual(smollm.kvCachePer1kTokensMb, 32);

    // Dynamic estimation from byte size (e.g. 8 GB file)
    const exactBytes = ModelVramCatalog.estimateProfileFromTag("custom-pulled:latest", 8 * 1024 * 1024 * 1024);
    assert.strictEqual(exactBytes.baseFootprintGb, 8.0);
    assert.strictEqual(exactBytes.baseFootprintMb, 8192);
  });

  it("should dynamically sync profiles from installed models list", () => {
    const catalog = new ModelVramCatalog({});
    assert.strictEqual(catalog.getProfile("new-dynamic-model:14b"), undefined);

    catalog.syncFromInstalledModels([
      {
        name: "new-dynamic-model:14b",
        size: 9663676416, // ~9 GB
        details: {
          parameter_size: "14.2B",
          quantization_level: "Q4_K_M",
        },
      },
    ]);

    const resolved = catalog.getProfile("new-dynamic-model:14b");
    assert.ok(resolved);
    assert.strictEqual(resolved?.baseFootprintGb, 9.0);
  });
});
