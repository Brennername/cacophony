import test from "node:test";
import assert from "node:assert/strict";
import { MicroModelToolRouter } from "../inference/MicroModelToolRouter.js";

test("Pipeline Strategy Dispatch Integration Suite (T95.2.2)", async (t) => {
  const router = new MicroModelToolRouter();

  await t.test("dispatches small single-file tasks to MONOLITHIC_FILE_GENERATION", async () => {
    const smallTask = {
      taskTitle: "Add ColorPalette enum",
      taskPrompt: "Create a simple enum of theme colors",
      targetFilePath: "packages/shared-types/src/colors.ts",
      existingFileLines: 0,
    };

    const decision = await router.routeTaskStrategy(smallTask);
    assert.equal(decision.strategy, "MONOLITHIC_FILE_GENERATION");
    assert.ok(decision.confidence >= 0.8);
  });

  await t.test("dispatches large multi-method classes to HASH_STUB_SPLICING", async () => {
    const largeTask = {
      taskTitle: "Update calculateRisk in RiskEngine",
      taskPrompt: "Modify calculateRisk to use exponential weighting across transaction history",
      targetFilePath: "packages/engine/src/analytics/RiskEngine.ts",
      existingFileLines: 280,
      existingMethodCount: 8,
    };

    const decision = await router.routeTaskStrategy(largeTask);
    assert.equal(decision.strategy, "HASH_STUB_SPLICING");
    assert.equal(decision.confidence, 0.99);
  });

  await t.test("dispatches method addition in moderate files to HASH_STUB_SPLICING", async () => {
    const methodTask = {
      taskTitle: "Add method validateSignature",
      taskPrompt: "Implement method validateSignature in CryptoService",
      targetFilePath: "packages/engine/src/crypto/CryptoService.ts",
      existingFileLines: 75,
      existingMethodCount: 4,
    };

    const decision = await router.routeTaskStrategy(methodTask);
    assert.equal(decision.strategy, "HASH_STUB_SPLICING");
  });
});
