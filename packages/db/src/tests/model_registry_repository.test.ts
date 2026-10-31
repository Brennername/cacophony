import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { ModelRegistryRepository, type ModelRegistryRecord } from "../repositories/ModelRegistryRepository.js";

describe("ModelRegistryRepository", () => {
  let driver: PGliteDriver;
  let repo: ModelRegistryRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new ModelRegistryRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should register model entry and retrieve by model ID", async () => {
    const entry: Omit<ModelRegistryRecord, "created_at" | "updated_at"> = {
      model_id: "qwen2.5-coder:14b",
      family: "qwen2.5",
      provider: "ollama",
      context_window_size: 32768,
      max_output_tokens: 8192,
      tool_calling: true,
      diff_format: true,
      cost_per_1k_tokens: 0.0,
      is_local: true,
      tags_json: JSON.stringify(["coder", "local", "gpu"]),
    };

    await repo.upsert(entry);

    const fetched = await repo.getById("qwen2.5-coder:14b");
    assert.ok(fetched);
    assert.equal(fetched.model_id, "qwen2.5-coder:14b");
    assert.equal(fetched.family, "qwen2.5");
    assert.equal(fetched.provider, "ollama");
    assert.equal(fetched.context_window_size, 32768);
    assert.equal(fetched.max_output_tokens, 8192);
    assert.equal(fetched.tool_calling, true);
    assert.equal(fetched.is_local, true);
  });

  test("should update existing model entry on conflict", async () => {
    await repo.upsert({
      model_id: "deepseek-r1:8b",
      family: "deepseek",
      provider: "ollama",
      context_window_size: 8192,
      max_output_tokens: 4096,
      tool_calling: false,
      diff_format: false,
      cost_per_1k_tokens: 0.0,
      is_local: true,
      tags_json: "[]",
    });

    await repo.upsert({
      model_id: "deepseek-r1:8b",
      family: "deepseek-r1",
      provider: "ollama",
      context_window_size: 16384,
      max_output_tokens: 8192,
      tool_calling: true,
      diff_format: true,
      cost_per_1k_tokens: 0.0,
      is_local: true,
      tags_json: JSON.stringify(["reasoning"]),
    });

    const fetched = await repo.getById("deepseek-r1:8b");
    assert.ok(fetched);
    assert.equal(fetched.family, "deepseek-r1");
    assert.equal(fetched.context_window_size, 16384);
    assert.equal(fetched.tool_calling, true);
  });

  test("should list all model entries prioritizing local models", async () => {
    await repo.upsert({
      model_id: "cloud-model-1",
      family: "gpt",
      provider: "openai",
      context_window_size: 128000,
      max_output_tokens: 4096,
      tool_calling: true,
      diff_format: true,
      cost_per_1k_tokens: 0.005,
      is_local: false,
      tags_json: "[]",
    });

    await repo.upsert({
      model_id: "local-model-1",
      family: "llama",
      provider: "ollama",
      context_window_size: 8192,
      max_output_tokens: 2048,
      tool_calling: true,
      diff_format: true,
      cost_per_1k_tokens: 0.0,
      is_local: true,
      tags_json: "[]",
    });

    const list = await repo.listAll();
    assert.equal(list.length, 2);
    assert.equal(list[0]!.model_id, "local-model-1");
    assert.equal(list[1]!.model_id, "cloud-model-1");
  });

  test("should delete model entry", async () => {
    await repo.upsert({
      model_id: "obsolete-model",
      family: "test",
      provider: "test",
      context_window_size: 2048,
      max_output_tokens: 512,
      tool_calling: false,
      diff_format: false,
      cost_per_1k_tokens: 0.0,
      is_local: true,
      tags_json: "[]",
    });

    assert.ok(await repo.getById("obsolete-model"));

    await repo.delete("obsolete-model");
    assert.equal(await repo.getById("obsolete-model"), undefined);
  });
});
