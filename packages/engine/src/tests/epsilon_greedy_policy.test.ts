import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { BanditArmRecord } from "@cacophony/shared-types";
import { EpsilonGreedyPolicy } from "../bandit/EpsilonGreedyPolicy.js";

describe("EpsilonGreedyPolicy Test Suite", () => {
  const createMockArm = (
    modelId: string,
    successCount: number,
    failureCount: number,
    alpha = 2,
    beta = 2,
  ): BanditArmRecord => {
    const trialsCount = successCount + failureCount;
    return {
      armId: `role:${modelId}`,
      modelId,
      role: "coder",
      trialsCount,
      successCount,
      failureCount,
      totalReward: successCount,
      alpha,
      beta,
      averageTokensPerSec: 45.0,
      averageVramMb: 4096,
      lastSelectedAt: new Date().toISOString(),
    };
  };

  let policy: EpsilonGreedyPolicy;

  beforeEach(() => {
    policy = new EpsilonGreedyPolicy({
      initialEpsilon: 0.2,
      minEpsilon: 0.05,
      decayRate: 0.9,
    });
  });

  describe("Initialization and Configuration", () => {
    it("should initialize with default configuration when none is provided", () => {
      const defaultPolicy = new EpsilonGreedyPolicy();
      assert.strictEqual(defaultPolicy.policyType, "epsilon_greedy");
      assert.strictEqual(defaultPolicy.getEpsilon(), 0.2);
      assert.strictEqual(defaultPolicy.getEpoch(), 0);
    });

    it("should accept custom configuration parameters", () => {
      const customPolicy = new EpsilonGreedyPolicy({
        initialEpsilon: 0.5,
        minEpsilon: 0.01,
        decayRate: 0.8,
      });
      assert.strictEqual(customPolicy.getEpsilon(), 0.5);
      assert.strictEqual(customPolicy.getEpoch(), 0);
    });
  });

  describe("Arm Selection and Exploitation", () => {
    it("should throw an error when selecting from an empty arms list", () => {
      assert.throws(
        () => policy.selectArm([]),
        /No bandit arms available for selection/,
      );
    });

    it("should strictly exploit the arm with highest win rate when epsilon is zero", () => {
      const exploitOnlyPolicy = new EpsilonGreedyPolicy({
        initialEpsilon: 0.0,
        minEpsilon: 0.0,
        decayRate: 1.0,
      });

      const armLow = createMockArm("model-low:7b", 2, 8);
      const armMid = createMockArm("model-mid:7b", 5, 5);
      const armHigh = createMockArm("model-high:7b", 9, 1);

      const outcome = exploitOnlyPolicy.selectArm([armLow, armMid, armHigh]);

      assert.strictEqual(outcome.selectedModel, "model-high:7b");
      assert.strictEqual(outcome.armId, "role:model-high:7b");
      assert.strictEqual(outcome.policy, "epsilon_greedy");
      assert.strictEqual(outcome.isExploratory, false);
      assert.ok(outcome.confidenceScore >= 0.9);
      assert.match(outcome.explorationRationale, /Epsilon-Greedy exploitation/);
    });

    it("should use prior alpha and beta when arm has zero trials", () => {
      const exploitOnlyPolicy = new EpsilonGreedyPolicy({
        initialEpsilon: 0.0,
        minEpsilon: 0.0,
        decayRate: 1.0,
      });

      const armZeroTrialsHighPrior = createMockArm("model-prior-high:7b", 0, 0, 8, 2);
      const armZeroTrialsLowPrior = createMockArm("model-prior-low:7b", 0, 0, 2, 8);

      const outcome = exploitOnlyPolicy.selectArm([
        armZeroTrialsLowPrior,
        armZeroTrialsHighPrior,
      ]);

      assert.strictEqual(outcome.selectedModel, "model-prior-high:7b");
      assert.strictEqual(outcome.isExploratory, false);
      assert.strictEqual(outcome.confidenceScore, 0.8);
    });
  });

  describe("Exploration and Randomness", () => {
    it("should strictly explore when epsilon is 1.0", () => {
      const exploreOnlyPolicy = new EpsilonGreedyPolicy({
        initialEpsilon: 1.0,
        minEpsilon: 1.0,
        decayRate: 1.0,
      });

      const armA = createMockArm("model-a:7b", 1, 9);
      const armB = createMockArm("model-b:7b", 9, 1);

      const outcome = exploreOnlyPolicy.selectArm([armA, armB]);

      assert.strictEqual(outcome.isExploratory, true);
      assert.match(outcome.explorationRationale, /Epsilon-Greedy exploration/);
      assert.ok(outcome.selectedModel === "model-a:7b" || outcome.selectedModel === "model-b:7b");
    });

    it("should distribute selections across multiple arms during pure exploration", () => {
      const exploreOnlyPolicy = new EpsilonGreedyPolicy({
        initialEpsilon: 1.0,
        minEpsilon: 1.0,
        decayRate: 1.0,
      });

      const armA = createMockArm("model-a:7b", 5, 5);
      const armB = createMockArm("model-b:7b", 5, 5);
      const armC = createMockArm("model-c:7b", 5, 5);

      const counts: Record<string, number> = {
        "model-a:7b": 0,
        "model-b:7b": 0,
        "model-c:7b": 0,
      };

      for (let i = 0; i < 90; i++) {
        const outcome = exploreOnlyPolicy.selectArm([armA, armB, armC]);
        counts[outcome.selectedModel] = (counts[outcome.selectedModel] ?? 0) + 1;
      }

      assert.ok((counts["model-a:7b"] ?? 0) > 0);
      assert.ok((counts["model-b:7b"] ?? 0) > 0);
      assert.ok((counts["model-c:7b"] ?? 0) > 0);
    });
  });

  describe("Epsilon Decay and Epoch Stepping", () => {
    it("should decay epsilon per epoch step according to decayRate", () => {
      const initial = policy.getEpsilon();
      assert.strictEqual(initial, 0.2);

      const epoch1Epsilon = policy.stepEpoch(1);
      assert.strictEqual(policy.getEpoch(), 1);
      assert.ok(Math.abs(epoch1Epsilon - 0.2 * 0.9) < 1e-6);

      const epoch2Epsilon = policy.stepEpoch(1);
      assert.strictEqual(policy.getEpoch(), 2);
      assert.ok(Math.abs(epoch2Epsilon - 0.2 * 0.81) < 1e-6);
    });

    it("should not decay epsilon below minEpsilon", () => {
      policy.stepEpoch(50);
      assert.strictEqual(policy.getEpoch(), 50);
      assert.strictEqual(policy.getEpsilon(), 0.05);
    });

    it("should reset exploration state cleanly", () => {
      policy.stepEpoch(10);
      assert.strictEqual(policy.getEpoch(), 10);
      assert.ok(policy.getEpsilon() < 0.2);

      policy.resetExploration();
      assert.strictEqual(policy.getEpoch(), 0);
      assert.strictEqual(policy.getEpsilon(), 0.2);
    });
  });
});
