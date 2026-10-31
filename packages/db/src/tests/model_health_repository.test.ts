import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { ModelHealthRepository } from "../repositories/ModelHealthRepository.js";

describe("ModelHealthRepository", () => {
  let driver: PGliteDriver;
  let repo: ModelHealthRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new ModelHealthRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  describe("Profile Lifecycle and Run Telemetry", () => {
    test("should initialize default profile with ACTIVE status on first access", async () => {
      const profile = await repo.getProfile("qwen2.5-coder:7b", "ollama");
      assert.equal(profile.modelId, "qwen2.5-coder:7b");
      assert.equal(profile.provider, "ollama");
      assert.equal(profile.status, "ACTIVE");
      assert.equal(profile.totalTasks, 0);
      assert.equal(profile.totalSuccess, 0);
      assert.equal(profile.totalFailures, 0);
    });

    test("should record successful run and update latency metrics", async () => {
      await repo.recordRun("deepseek-r1:14b", "ollama", true, 450, 32.5);

      const profile = await repo.getProfile("deepseek-r1:14b", "ollama");
      assert.equal(profile.totalTasks, 1);
      assert.equal(profile.totalSuccess, 1);
      assert.equal(profile.totalFailures, 0);
      assert.equal(profile.consecutiveFailures, 0);
      assert.equal(profile.avgLatencyMs, 450);
      assert.equal(profile.avgTokensPerSec, 32.5);
    });

    test("should trigger EJECTED status after 3 consecutive failures", async () => {
      const model = "unstable-model:7b";
      await repo.recordRun(model, "ollama", false, 500, 10.0);
      let p = await repo.getProfile(model, "ollama");
      assert.equal(p.status, "ACTIVE");
      assert.equal(p.consecutiveFailures, 1);

      await repo.recordRun(model, "ollama", false, 500, 10.0);
      p = await repo.getProfile(model, "ollama");
      assert.equal(p.status, "ACTIVE");
      assert.equal(p.consecutiveFailures, 2);

      await repo.recordRun(model, "ollama", false, 500, 10.0);
      p = await repo.getProfile(model, "ollama");
      assert.equal(p.status, "EJECTED");
      assert.equal(p.consecutiveFailures, 3);
    });

    test("should prevent ejection when model is registered as protected", async () => {
      const protectedModel = "anchor-frontier-model:14b";
      repo.setProtectionChecker((modelId) => modelId === protectedModel);

      // Record 4 consecutive failures
      for (let i = 0; i < 4; i++) {
        await repo.recordRun(protectedModel, "ollama", false, 600, 15.0);
      }

      const profile = await repo.getProfile(protectedModel, "ollama");
      assert.equal(profile.status, "ACTIVE");
      assert.equal(profile.consecutiveFailures, 4);
    });
  });

  describe("Remediation and Status Management", () => {
    test("should track remediation attempts and compute recovery rate", async () => {
      const model = "remedy-model:8b";
      await repo.recordRemediation(model, true);
      await repo.recordRemediation(model, false);

      const profile = await repo.getProfile(model, "ollama");
      assert.equal(profile.totalRemediationAttempts, 2);
      assert.equal(profile.totalRemediationSuccess, 1);
      assert.equal(profile.remediationRecoveryRate, 50.0);
    });

    test("should update status and reset consecutive failures when reactivated", async () => {
      const model = "reactivate-me:7b";
      // Fail 3 times to eject
      for (let i = 0; i < 3; i++) {
        await repo.recordRun(model, "ollama", false, 500, 10);
      }
      assert.equal((await repo.getProfile(model, "ollama")).status, "EJECTED");

      // Reactivate
      await repo.updateStatus(model, "ACTIVE");
      const profile = await repo.getProfile(model, "ollama");
      assert.equal(profile.status, "ACTIVE");
      assert.equal(profile.consecutiveFailures, 0);
    });
  });

  describe("Arena Epochs and Epoch History", () => {
    test("should retrieve active epoch and advance to new epoch", async () => {
      const epoch1 = await repo.getCurrentEpoch();
      assert.ok(epoch1);
      assert.equal(epoch1.epochId, 1);
      assert.equal(epoch1.isActive, true);

      // Advance epoch
      const epoch2 = await repo.advanceEpoch("Epoch 2: Fine Tuning", "Post-optimization rollout");
      assert.equal(epoch2.epochId, 2);
      assert.equal(epoch2.name, "Epoch 2: Fine Tuning");
      assert.equal(epoch2.isActive, true);

      const current = await repo.getCurrentEpoch();
      assert.equal(current.epochId, 2);
    });
  });
});
