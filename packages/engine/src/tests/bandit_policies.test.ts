import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { EpsilonGreedyPolicy } from "../bandit/EpsilonGreedyPolicy.js";
import type { BanditArmRecord } from "@cacophony/shared-types";

describe("EpsilonGreedyPolicy Test Suite", () => {
  const sampleArms: BanditArmRecord[] = [
    {
      armId: "coder:qwen2.5",
      modelId: "qwen2.5-coder:7b",
      role: "coder",
      trialsCount: 10,
      successCount: 8,
      failureCount: 2,
      totalReward: 6.0,
      alpha: 9,
      beta: 3,
      averageTokensPerSec: 30,
      averageVramMb: 4096,
    },
    {
      armId: "coder:deepseek",
      modelId: "deepseek-r1:8b",
      role: "coder",
      trialsCount: 10,
      successCount: 4,
      failureCount: 6,
      totalReward: -2.0,
      alpha: 5,
      beta: 7,
      averageTokensPerSec: 25,
      averageVramMb: 4096,
    },
  ];

  test("should exploit arm with highest mean win rate when epsilon is 0", () => {
    const policy = new EpsilonGreedyPolicy({ initialEpsilon: 0, minEpsilon: 0 });
    const outcome = policy.selectArm(sampleArms);

    assert.strictEqual(outcome.isExploratory, false);
    assert.strictEqual(outcome.selectedModel, "qwen2.5-coder:7b");
    assert.strictEqual(outcome.armId, "coder:qwen2.5");
    assert.strictEqual(outcome.policy, "epsilon_greedy");
  });

  test("should decay epsilon exponentially across epochs down to minEpsilon", () => {
    const policy = new EpsilonGreedyPolicy({
      initialEpsilon: 0.2,
      minEpsilon: 0.05,
      decayRate: 0.5,
    });

    assert.strictEqual(policy.getEpsilon(), 0.2);

    // Epoch 1: 0.2 * 0.5^1 = 0.10
    const eps1 = policy.stepEpoch();
    assert.ok(Math.abs(eps1 - 0.1) < 0.001);

    // Epoch 2: 0.2 * 0.5^2 = 0.05
    const eps2 = policy.stepEpoch();
    assert.ok(Math.abs(eps2 - 0.05) < 0.001);

    // Epoch 3: bounded by minEpsilon = 0.05
    const eps3 = policy.stepEpoch();
    assert.strictEqual(eps3, 0.05);
  });

  test("should reset exploration budget back to initialEpsilon", () => {
    const policy = new EpsilonGreedyPolicy({
      initialEpsilon: 0.3,
      minEpsilon: 0.05,
      decayRate: 0.9,
    });
    policy.stepEpoch(10);
    assert.ok(policy.getEpsilon() < 0.3);

    policy.resetExploration();
    assert.strictEqual(policy.getEpsilon(), 0.3);
    assert.strictEqual(policy.getEpoch(), 0);
  });
});
