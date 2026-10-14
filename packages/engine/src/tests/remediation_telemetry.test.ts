import test from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "@cacophony/db";
import { MigrationRunner } from "@cacophony/db";
import { ModelHealthRepository } from "@cacophony/db";

test("Phase 63: Remediation Success Telemetry Tracking Suite (T63.5)", async (t) => {
  let driver: PGliteDriver;
  let healthRepo: ModelHealthRepository;

  t.beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    healthRepo = new ModelHealthRepository(driver);
  });

  t.afterEach(async () => {
    await driver.close();
  });

  await t.test(
    "T63.5.1: recordRemediation tracks attempts and successes per model",
    async () => {
      const model = "qwen2.5-coder:7b-instruct-q4_K_M";

      // 1st remediation: failure
      const afterFail = await healthRepo.recordRemediation(model, false);
      assert.strictEqual(afterFail.totalRemediationAttempts, 1);
      assert.strictEqual(afterFail.totalRemediationSuccess, 0);
      assert.strictEqual(afterFail.remediationRecoveryRate, 0.0);

      // 2nd remediation: success
      const afterSuccess = await healthRepo.recordRemediation(model, true);
      assert.strictEqual(afterSuccess.totalRemediationAttempts, 2);
      assert.strictEqual(afterSuccess.totalRemediationSuccess, 1);
      assert.strictEqual(afterSuccess.remediationRecoveryRate, 50.0);

      // 3rd remediation: success
      const afterSuccess2 = await healthRepo.recordRemediation(model, true);
      assert.strictEqual(afterSuccess2.totalRemediationAttempts, 3);
      assert.strictEqual(afterSuccess2.totalRemediationSuccess, 2);
      assert.strictEqual(afterSuccess2.remediationRecoveryRate, 66.67);
    },
  );

  await t.test(
    "T63.5.2: computeRemediationRecoveryRate computes percentage accurately in profiles",
    async () => {
      const model = "deepseek-r1:8b";

      // Baseline: 0 attempts -> 0.0%
      const initialRate =
        await healthRepo.computeRemediationRecoveryRate(model);
      assert.strictEqual(initialRate, 0.0);

      // 4 attempts, 3 successes -> 75.0%
      await healthRepo.recordRemediation(model, true);
      await healthRepo.recordRemediation(model, true);
      await healthRepo.recordRemediation(model, false);
      await healthRepo.recordRemediation(model, true);

      const updatedProfile = await healthRepo.getProfile(model);
      assert.strictEqual(updatedProfile.totalRemediationAttempts, 4);
      assert.strictEqual(updatedProfile.totalRemediationSuccess, 3);
      assert.strictEqual(updatedProfile.remediationRecoveryRate, 75.0);

      const rate = await healthRepo.computeRemediationRecoveryRate(model);
      assert.strictEqual(rate, 75.0);
    },
  );

  await t.test(
    "T63.5.3: listProfiles includes remediation recovery rate and counters",
    async () => {
      await healthRepo.recordRemediation("model-alpha", true);
      await healthRepo.recordRemediation("model-beta", false);

      const profiles = await healthRepo.listProfiles();
      const alpha = profiles.find((p) => p.modelId === "model-alpha");
      const beta = profiles.find((p) => p.modelId === "model-beta");

      assert.ok(alpha);
      assert.strictEqual(alpha.totalRemediationAttempts, 1);
      assert.strictEqual(alpha.totalRemediationSuccess, 1);
      assert.strictEqual(alpha.remediationRecoveryRate, 100.0);

      assert.ok(beta);
      assert.strictEqual(beta.totalRemediationAttempts, 1);
      assert.strictEqual(beta.totalRemediationSuccess, 0);
      assert.strictEqual(beta.remediationRecoveryRate, 0.0);
    },
  );

  await t.test(
    "T63.5.4: advanceEpoch snapshots remediation telemetry into history and resets cleanly",
    async () => {
      await healthRepo.recordRemediation("epoch-model", true);
      await healthRepo.recordRemediation("epoch-model", true);

      const epoch1History = await healthRepo.getCurrentEpoch();
      assert.strictEqual(epoch1History.epochId, 1);

      await healthRepo.advanceEpoch("Epoch 2", "Epoch migration test");

      const history = await healthRepo.getEpochHistory(1);
      const snapshotted = history.find((p) => p.modelId === "epoch-model");
      assert.ok(snapshotted);
      assert.strictEqual(snapshotted.totalRemediationAttempts, 2);
      assert.strictEqual(snapshotted.totalRemediationSuccess, 2);

      // After reset, current profile has 0
      const current = await healthRepo.getProfile("epoch-model");
      assert.strictEqual(current.totalRemediationAttempts, 0);
      assert.strictEqual(current.totalRemediationSuccess, 0);
    },
  );

  await t.test(
    "T63.5.3: GET /api/models/leaderboard returns remediation recovery telemetry",
    async () => {
      const { CacophonyHttpServer } =
        await import("../daemon/CacophonyHttpServer.js");

      await healthRepo.recordRemediation("leaderboard-model", true);
      await healthRepo.recordRemediation("leaderboard-model", false);

      const mockDaemon = {
        getModelHealthRepository: () => healthRepo,
        getTenancyGuard: () => null,
        getModelManager: () => null,
        getBenchmarkRunner: () => null,
        getStreamTapManager: () => null,
        getTaskRepository: () => ({ listPending: async () => [] }),
        getTelemetryPoller: () => null,
        getUserSessionRepository: () => null,
        getScheduler: () => null,
      };

      const server = new CacophonyHttpServer(mockDaemon as any, {
        httpPort: 0,
        httpHost: "127.0.0.1",
      });
      await server.start();

      try {
        const address = (server as any).server.address();
        const res = await fetch(
          `http://127.0.0.1:${address.port}/api/models/leaderboard`,
        );
        assert.strictEqual(res.status, 200);
        const data = (await res.json()) as any[];

        const modelEntry = data.find((m) => m.modelId === "leaderboard-model");
        assert.ok(modelEntry, "Expected to find leaderboard-model in response");
        assert.strictEqual(modelEntry.totalRemediationAttempts, 2);
        assert.strictEqual(modelEntry.totalRemediationSuccess, 1);
        assert.strictEqual(modelEntry.remediationRecoveryRate, 50.0);
      } finally {
        await server.stop();
      }
    },
  );
});
