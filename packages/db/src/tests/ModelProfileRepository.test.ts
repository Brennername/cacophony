import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { ModelProfileRepository } from "../repositories/ModelProfileRepository.js";

describe("ModelProfileRepository Suite (T94.3.1)", () => {
  let driver: PGliteDriver;
  let profileRepo: ModelProfileRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    profileRepo = new ModelProfileRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should retrieve default review capabilities when no custom profile is configured", async () => {
    const cap = await profileRepo.getReviewCapability("deepseek-r1:8b");
    assert.equal(cap.modelId, "deepseek-r1:8b");
    assert.equal(cap.contextWindow, 8192);
    assert.equal(cap.reviewTemperature, 0.2);
    assert.equal(cap.domainAffinities["SecurityAuditor"], 0.95);
    assert.equal(cap.domainAffinities["ArchitectureAuditor"], 0.9);
  });

  test("should configure and persist custom review capabilities per model", async () => {
    const updated = await profileRepo.setReviewCapability(
      "qwen2.5-coder:14b",
      16384,
      0.15,
      {
        ArchitectureAuditor: 0.98,
        SecurityAuditor: 0.85,
        DxUxAuditor: 0.9,
      }
    );

    assert.equal(updated.modelId, "qwen2.5-coder:14b");
    assert.equal(updated.contextWindow, 16384);
    assert.equal(updated.reviewTemperature, 0.15);
    assert.equal(updated.domainAffinities["ArchitectureAuditor"], 0.98);

    const retrieved = await profileRepo.getReviewCapability("qwen2.5-coder:14b");
    assert.equal(retrieved.contextWindow, 16384);
    assert.equal(retrieved.reviewTemperature, 0.15);
  });

  test("should infer domain affinities tailored to model characteristics", () => {
    const r1Affinities = profileRepo.inferDomainAffinities("deepseek-r1:14b");
    assert.ok(r1Affinities["SecurityAuditor"]! >= 0.9);

    const coderAffinities = profileRepo.inferDomainAffinities("qwen2.5-coder:7b");
    assert.ok(coderAffinities["ArchitectureAuditor"]! >= 0.9);

    const gemmaAffinities = profileRepo.inferDomainAffinities("gemma3:4b-it-qat");
    assert.ok(gemmaAffinities["DxUxAuditor"]! >= 0.85);
  });
});
