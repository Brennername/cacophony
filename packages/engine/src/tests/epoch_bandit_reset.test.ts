import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EpsilonGreedyPolicy } from "../bandit/EpsilonGreedyPolicy.js";
import { ThompsonSamplingPolicy } from "../bandit/ThompsonSamplingPolicy.js";
import { BanditTaskScheduler } from "../bandit/BanditTaskScheduler.js";
import { StreamTapManager } from "../inference/StreamTapManager.js";
import type { BanditArmRecord } from "@cacophony/shared-types";

describe("Epoch Bandit Policy Reset & Broadcast Suite (T82.4)", () => {
  test("EpsilonGreedyPolicy should decay across epochs and reset exploration on epoch advancement", () => {
    const policy = new EpsilonGreedyPolicy({
      initialEpsilon: 0.3,
      minEpsilon: 0.05,
      decayRate: 0.5
    });

    assert.equal(policy.getEpsilon(), 0.3);
    assert.equal(policy.getEpoch(), 0);

    // Step through 2 epochs
    policy.stepEpoch(2);
    assert.equal(policy.getEpoch(), 2);
    assert.ok(policy.getEpsilon() < 0.3);

    // Reset exploration on epoch advancement
    policy.resetExploration();
    assert.equal(policy.getEpoch(), 0);
    assert.equal(policy.getEpsilon(), 0.3);
  });

  test("ThompsonSamplingPolicy should select candidate models and reset arms to uniform priors", () => {
    const policy = new ThompsonSamplingPolicy({
      uniformPriorAlpha: 2,
      uniformPriorBeta: 2
    });

    const armA: BanditArmRecord = {
      armId: "implementer:model-a",
      modelId: "model-a",
      role: "implementer",
      trialsCount: 50,
      successCount: 45,
      failureCount: 5,
      totalReward: 45,
      alpha: 47,
      beta: 7,
      averageTokensPerSec: 30,
      averageVramMb: 4096
    };

    const armB: BanditArmRecord = {
      armId: "implementer:model-b",
      modelId: "model-b",
      role: "implementer",
      trialsCount: 50,
      successCount: 10,
      failureCount: 40,
      totalReward: 10,
      alpha: 12,
      beta: 42,
      averageTokensPerSec: 25,
      averageVramMb: 4096
    };

    const outcome = policy.selectArm([armA, armB]);
    assert.ok(outcome.selectedModel === "model-a" || outcome.selectedModel === "model-b");

    // Advance epoch and reset arms
    policy.stepEpoch(1);
    assert.equal(policy.getEpoch(), 1);

    const resetArms = policy.resetArms([armA, armB]);
    assert.equal(policy.getEpoch(), 0);
    const arm0 = resetArms[0]!;
    const arm1 = resetArms[1]!;
    assert.equal(arm0.alpha, 2);
    assert.equal(arm0.beta, 2);
    assert.equal(arm0.trialsCount, 0);
    assert.equal(arm0.successCount, 0);
    assert.equal(arm1.alpha, 2);
    assert.equal(arm1.beta, 2);
    assert.equal(arm1.trialsCount, 0);
  });

  test("BanditTaskScheduler resetArms and resetExploration re-establish uniform exploration", () => {
    const scheduler = new BanditTaskScheduler({ explorationRate: 0.1 });
    scheduler.registerArm("model-1", "implementer", 10, 2);
    scheduler.setEpsilon(0.02);

    scheduler.resetArms(2, 2);
    scheduler.resetExploration(0.15);

    const arms = scheduler.getArms("implementer");
    assert.equal(arms.length, 1);
    const arm = arms[0]!;
    assert.equal(arm.alpha, 2);
    assert.equal(arm.beta, 2);
    assert.equal(arm.trialsCount, 0);
  });

  test("StreamTapManager broadcasts arena_epoch_advanced events to tap listeners", () => {
    const manager = new StreamTapManager();
    const received: any[] = [];

    const untap = manager.tapEpochAdvanced((event) => {
      received.push(event);
    });

    manager.broadcastEpochAdvanced({
      epochId: 2,
      name: "Epoch 2: Architecture Upgrade",
      reason: "Pipeline fixes deployed"
    });

    assert.equal(received.length, 1);
    assert.equal(received[0].epochId, 2);
    assert.equal(received[0].name, "Epoch 2: Architecture Upgrade");
    assert.ok(received[0].timestamp > 0);

    untap();
    manager.broadcastEpochAdvanced({
      epochId: 3,
      name: "Epoch 3",
      reason: "Next phase"
    });

    assert.equal(received.length, 1);
  });
});
