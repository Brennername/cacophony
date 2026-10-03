import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { EpsilonGreedyPolicy } from "../bandit/EpsilonGreedyPolicy.js";
import type { BanditArmRecord } from "@cacophony/shared-types";

describe("EpsilonGreedyPolicy Verification Suite", () => {
  const arms: BanditArmRecord[] = [
    {
      armId: "arm-a",
      modelId: "model-a",
      role: "coder",
      trialsCount: 50,
      successCount: 45,
      failureCount: 5,
      totalReward: 40,
      alpha: 46,
      beta: 6,
      averageTokensPerSec: 28,
      averageVramMb: 4096,
    },
    {
      armId: "arm-b",
      modelId: "model-b",
      role: "coder",
      trialsCount: 50,
      successCount: 15,
      failureCount: 35,
      totalReward: -20,
      alpha: 16,
      beta: 36,
      averageTokensPerSec: 28,
      averageVramMb: 4096,
    },
  ];

  test("should verify epsilon decreases over epochs and exploitation probability increases", () => {
    const policy = new EpsilonGreedyPolicy({
      initialEpsilon: 0.2,
      minEpsilon: 0.05,
      decayRate: 0.995,
    });

    const initial = policy.getEpsilon();
    assert.strictEqual(initial, 0.2);

    for (let i = 0; i < 100; i++) {
      policy.stepEpoch();
    }

    const decayed = policy.getEpsilon();
    assert.ok(decayed < initial);
    assert.ok(decayed >= 0.05);

    // Over multiple trials with decayed epsilon, the superior arm-a should be chosen overwhelmingly
    let armACount = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const outcome = policy.selectArm(arms);
      if (outcome.armId === "arm-a") {
        armACount++;
      }
    }

    const armARatio = armACount / trials;
    // With decayed epsilon ~ 0.12, exploitation rate is ~88% + half of 12% = ~94%
    assert.ok(armARatio > 0.85);
  });
});
