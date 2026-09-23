import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ModelRegistry } from "../inference/ModelRegistry.js";
import { OpenAiCompatibleProvider } from "../inference/OpenAiCompatibleProvider.js";

describe("Model-Agnostic Registry & Multi-Provider Architecture", () => {
  describe("ModelRegistry Querying and Dynamic Routing", () => {
    const registry = new ModelRegistry();

    test("should list default local and frontier models", async () => {
      const models = await registry.listModels();
      assert.ok(models.length >= 4);

      const localModels = await registry.listModels({ isLocal: true });
      assert.ok(localModels.some((m) => m.modelId.includes("qwen")));
      assert.ok(localModels.every((m) => m.isLocal === true));
    });

    test("should select optimal local model when local preference is requested", async () => {
      const optimal = await registry.getOptimalModelForTask({
        contextTokensNeeded: 4000,
        prefersLocal: true
      });

      assert.ok(optimal);
      assert.equal(optimal?.isLocal, true);
    });

    test("should select frontier model when required context exceeds local window", async () => {
      const optimal = await registry.getOptimalModelForTask({
        contextTokensNeeded: 100000,
        prefersLocal: true
      });

      assert.ok(optimal);
      assert.equal(optimal?.isLocal, false);
      assert.ok(optimal?.contextWindowSize >= 100000);
    });

    test("should register and deregister custom model specs", async () => {
      await registry.register({
        modelId: "custom-local-model:latest",
        family: "llama",
        provider: "lmstudio",
        contextWindowSize: 16384,
        maxOutputTokens: 4096,
        toolCallingCapability: true,
        diffFormatCapability: true,
        costPer1kTokens: 0,
        isLocal: true,
        tags: ["custom"]
      });

      const found = await registry.getModel("custom-local-model:latest");
      assert.ok(found);
      assert.equal(found?.provider, "lmstudio");

      await registry.deregister("custom-local-model:latest");
      const deleted = await registry.getModel("custom-local-model:latest");
      assert.equal(deleted, undefined);
    });
  });

  describe("OpenAiCompatibleProvider", () => {
    test("should instantiate for LM Studio and Groq providers", () => {
      const lmStudio = new OpenAiCompatibleProvider({
        providerType: "lmstudio",
        baseUrl: "http://localhost:1234/v1"
      });
      assert.equal(lmStudio.getProviderType(), "lmstudio");

      const groq = new OpenAiCompatibleProvider({
        providerType: "groq",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: "gsk_test"
      });
      assert.equal(groq.getProviderType(), "groq");
    });
  });
});
