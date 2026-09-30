import test from "node:test";
import assert from "node:assert/strict";
import { OllamaProvider } from "../inference/OllamaProvider.js";
import type { ModelProfileRepository } from "@cacophony/db";
import type { ModelTuningProfile } from "@cacophony/shared-types";

test("Model Profile Dynamic Tuning & OllamaProvider Resolution (T79.1)", async (t) => {
  await t.test("OllamaProvider resolves default options when no profile repository or match exists", async () => {
    const provider = new OllamaProvider();
    const options = await provider.resolveModelOptions("qwen2.5-coder:7b");

    assert.strictEqual(options.num_ctx, 16384);
    assert.strictEqual(options.num_predict, 4096);
    assert.strictEqual(options.temperature, 0.2);
  });

  await t.test("OllamaProvider resolves custom options from active tuning profile", async () => {
    const mockProfile: ModelTuningProfile = {
      id: "profile-deepseek-r1",
      modelName: "deepseek-r1:8b",
      role: "architect",
      numPredict: 8192,
      numCtx: 16384,
      temperature: 0.6,
      topK: 50,
      topP: 0.95,
      repeatPenalty: 1.15,
      autoTuned: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const mockRepo: ModelProfileRepository = {
      getActiveProfile: async (modelName: string, _role?: string) => {
        if (modelName === "deepseek-r1:8b") return mockProfile;
        return null;
      },
      listAllProfiles: async () => [mockProfile],
      upsertProfile: async (p: any) => ({ ...p, createdAt: "", updatedAt: "" }),
      deleteProfile: async () => true
    } as unknown as ModelProfileRepository;

    const provider = new OllamaProvider({ profileRepository: mockRepo });
    const options = await provider.resolveModelOptions("deepseek-r1:8b", "architect");

    assert.strictEqual(options.num_predict, 8192);
    assert.strictEqual(options.num_ctx, 16384);
    assert.strictEqual(options.temperature, 0.6);
    assert.strictEqual(options.top_k, 50);
    assert.strictEqual(options.top_p, 0.95);
    assert.strictEqual(options.repeat_penalty, 1.15);
  });
});
