import test from "node:test";
import assert from "node:assert/strict";
import { EngineAutoTuner } from "../scheduler/EngineAutoTuner.js";
import type { ModelProfileRepository } from "@cacophony/db";
import type { ModelTuningProfile } from "@cacophony/shared-types";

test("EngineAutoTuner Suite", async (t) => {
  await t.test("computes optimal profile for reasoner model on high-VRAM host", () => {
    const mockRepo = {} as ModelProfileRepository;
    const tuner = new EngineAutoTuner({
      profileRepo: mockRepo,
      hardwareSpec: { totalVramGb: 24, availableVramGb: 24 }
    });

    const profile = tuner.computeOptimalProfile("deepseek-r1:8b", "architect");
    assert.strictEqual(profile.role, "architect");
    assert.strictEqual(profile.numCtx, 32768);
    assert.strictEqual(profile.numPredict, 8192);
    assert.strictEqual(profile.temperature, 0.6);
    assert.strictEqual(profile.autoTuned, true);
    assert.strictEqual(profile.isActive, true);
  });

  await t.test("computes optimal profile for implementer coder on moderate-VRAM host", () => {
    const mockRepo = {} as ModelProfileRepository;
    const tuner = new EngineAutoTuner({
      profileRepo: mockRepo,
      hardwareSpec: { totalVramGb: 16, availableVramGb: 12 }
    });

    const profile = tuner.computeOptimalProfile("qwen2.5-coder:7b", "implementer");
    assert.strictEqual(profile.role, "implementer");
    assert.strictEqual(profile.numCtx, 16384);
    assert.strictEqual(profile.numPredict, 4096);
    assert.strictEqual(profile.temperature, 0.05);
    assert.strictEqual(profile.autoTuned, true);
  });

  await t.test("automatically raises completion limits for models experiencing truncation", () => {
    const mockRepo = {} as ModelProfileRepository;
    const tuner = new EngineAutoTuner({
      profileRepo: mockRepo,
      hardwareSpec: { totalVramGb: 16, availableVramGb: 12 }
    });

    // 0 truncations
    const base = tuner.computeOptimalProfile("qwen2.5-coder:7b", "implementer", 0);
    // 2 truncations
    const elevated = tuner.computeOptimalProfile("qwen2.5-coder:7b", "implementer", 2);

    assert.strictEqual(base.numPredict, 4096);
    assert.strictEqual(elevated.numPredict, 4096 + (2 * 2048)); // 8192
    assert.ok(elevated.numPredict > base.numPredict);
  });

  await t.test("autoTuneModels persists tuned profiles across installed models", async () => {
    const savedProfiles: ModelTuningProfile[] = [];
    const mockRepo = {
      upsertProfile: async (p: any): Promise<ModelTuningProfile> => {
        const full = { ...p, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        savedProfiles.push(full);
        return full;
      }
    } as unknown as ModelProfileRepository;

    const tuner = new EngineAutoTuner({
      profileRepo: mockRepo,
      hardwareSpec: { totalVramGb: 16, availableVramGb: 12 }
    });

    const results = await tuner.autoTuneModels(["deepseek-r1:8b", "qwen2.5-coder:7b"]);
    assert.strictEqual(results.length, 2);
    assert.strictEqual(savedProfiles.length, 2);
    assert.strictEqual(savedProfiles[0]?.role, "architect");
    assert.strictEqual(savedProfiles[1]?.role, "implementer");
  });
});
