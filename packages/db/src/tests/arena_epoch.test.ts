import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { ModelHealthRepository } from "../repositories/ModelHealthRepository.js";

describe("Arena Telemetry Epoching & Clean-Slate Reset Test Suite (T82.1 & T82.2)", () => {
  let driver: PGliteDriver;
  let healthRepo: ModelHealthRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    healthRepo = new ModelHealthRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should seed baseline Epoch 1 on startup", async () => {
    const epoch = await healthRepo.getCurrentEpoch();
    assert.equal(epoch.epochId, 1);
    assert.equal(epoch.isActive, true);
    assert.ok(epoch.name.includes("Epoch 1"));
  });

  test("should record runs, evict on consecutive failures, and resetAllStats cleanly", async () => {

    await healthRepo.recordRun("test-model-1", "ollama", false, 1500, 5.0);
    await healthRepo.recordRun("test-model-1", "ollama", false, 1600, 4.8);
    const profile = await healthRepo.recordRun("test-model-1", "ollama", false, 1400, 5.2);

    assert.equal(profile.consecutiveFailures, 3);
    assert.equal(profile.status, "EJECTED");

    await healthRepo.resetAllStats();

    const resetProfile = await healthRepo.getProfile("test-model-1");
    assert.equal(resetProfile.totalTasks, 0);
    assert.equal(resetProfile.totalFailures, 0);
    assert.equal(resetProfile.consecutiveFailures, 0);
    assert.equal(resetProfile.status, "ACTIVE");
  });

  test("should advance to Epoch 2, snapshot history, and un-eject models", async () => {

    await healthRepo.recordRun("dirty-model-a", "ollama", true, 2000, 8.0);
    await healthRepo.recordRun("dirty-model-a", "ollama", false, 2500, 7.5);
    await healthRepo.recordRun("dirty-model-a", "ollama", false, 2400, 7.2);
    await healthRepo.recordRun("dirty-model-a", "ollama", false, 2300, 7.0);

    const initial = await healthRepo.getProfile("dirty-model-a");
    assert.equal(initial.status, "EJECTED");
    assert.equal(initial.totalTasks, 4);

    const epoch2 = await healthRepo.advanceEpoch(
      "Epoch 2: Post-Bootstrap Mitigation",
      "Cleared failure cascade from PR #74 and restored healthy arena baseline",
      "All models restored to ACTIVE"
    );

    assert.equal(epoch2.epochId, 2);
    assert.equal(epoch2.isActive, true);
    assert.equal(epoch2.name, "Epoch 2: Post-Bootstrap Mitigation");

    const newProfile = await healthRepo.getProfile("dirty-model-a");
    assert.equal(newProfile.totalTasks, 0);
    assert.equal(newProfile.consecutiveFailures, 0);
    assert.equal(newProfile.status, "ACTIVE");

    const epochs = await healthRepo.listEpochs();
    assert.equal(epochs.length, 2);
    assert.equal(epochs[0]?.isActive, false);
    assert.ok(epochs[0]?.endedAt !== null);

    const history = await healthRepo.getEpochHistory(1);
    const snapshotted = history.find((h) => h.modelId === "dirty-model-a");
    assert.ok(snapshotted !== undefined);
    assert.equal(snapshotted?.totalTasks, 4);
    assert.equal(snapshotted?.status, "EJECTED");
  });
});
