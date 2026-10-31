import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { BanditArmRecord } from "@cacophony/shared-types";
import { ThompsonSamplingPolicy } from "../bandit/ThompsonSamplingPolicy.js";

describe("ThompsonSamplingPolicy Test Suite", () => {
  const createMockArm = (
    modelId: string,
    alpha: number,
    beta: number,
    successCount = 0,
    failureCount = 0,
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
      averageTokensPerSec: 50.0,
      averageVramMb: 8192,
      lastSelectedAt: new Date().toISOString(),
    };
  };

  let policy: ThompsonSamplingPolicy;

  beforeEach(() => {
    policy = new ThompsonSamplingPolicy({
      uniformPriorAlpha: 2,
      uniformPriorBeta: 2,
    });
  });

  describe("Initialization and Configuration", () => {
    it("should initialize with default uniform prior of 2", () => {
      const defaultPolicy = new ThompsonSamplingPolicy();
      assert.strictEqual(defaultPolicy.policyType, "thompson_sampling");
      assert.strictEqual(defaultPolicy.getEpoch(), 0);
    });

    it("should accept custom uniform prior parameters", () => {
      const customPolicy = new ThompsonSamplingPolicy({
        uniformPriorAlpha: 5,
        uniformPriorBeta: 3,
      });
      assert.strictEqual(customPolicy.policyType, "thompson_sampling");
      assert.strictEqual(customPolicy.getEpoch(), 0);
    });
  });

  describe("Arm Selection and Posterior Sampling", () => {
    it("should throw an error when selecting from an empty arms list", () => {
      assert.throws(
        () => policy.selectArm([]),
        /No bandit arms available for selection/,
      );
    });

    it("should select an arm with high posterior draw when dominant alpha is present", () => {
      const dominantArm = createMockArm("model-dominant:14b", 100, 1, 100, 1);
      const weakArm = createMockArm("model-weak:7b", 1, 100, 1, 100);

      const selections: Record<string, number> = {
        "model-dominant:14b": 0,
        "model-weak:7b": 0,
      };

      for (let i = 0; i < 50; i++) {
        const outcome = policy.selectArm([dominantArm, weakArm]);
        selections[outcome.selectedModel] = (selections[outcome.selectedModel] ?? 0) + 1;
        assert.strictEqual(outcome.policy, "thompson_sampling");
        assert.ok(outcome.confidenceScore >= 0 && outcome.confidenceScore <= 1);
        assert.match(outcome.explorationRationale, /Thompson Sampling posterior draw/);
      }

      assert.ok(
        (selections["model-dominant:14b"] ?? 0) >
          (selections["model-weak:7b"] ?? 0),
      );
      assert.ok((selections["model-dominant:14b"] ?? 0) >= 30);
    });

    it("should compute accurate mean win rate for arms", () => {
      const armSymmetric = createMockArm("model-sym:7b", 10, 10);
      assert.strictEqual(policy.calculateMeanWinRate(armSymmetric), 0.5);

      const armHigh = createMockArm("model-high:7b", 80, 20);
      assert.strictEqual(policy.calculateMeanWinRate(armHigh), 0.8);

      const armZero = createMockArm("model-zero:7b", 0, 0);
      assert.strictEqual(policy.calculateMeanWinRate(armZero), 0.5);
    });

    it("should correctly identify exploratory vs exploitative decisions based on mean win rate", () => {
      const arm = createMockArm("model-test:7b", 5, 5);
      const outcome = policy.selectArm([arm]);

      const meanRate = policy.calculateMeanWinRate(arm);
      assert.strictEqual(outcome.isExploratory, outcome.confidenceScore > meanRate);
    });
  });

  describe("Arm Reset and State Management", () => {
    it("should reset arms to default priors and clear accumulated trial counts", () => {
      const customPolicy = new ThompsonSamplingPolicy({
        uniformPriorAlpha: 4,
        uniformPriorBeta: 6,
      });

      const dirtyArms: BanditArmRecord[] = [
        createMockArm("model-1:7b", 25, 5, 25, 5),
        createMockArm("model-2:7b", 10, 15, 10, 15),
      ];

      const resetArms = customPolicy.resetArms(dirtyArms);

      assert.strictEqual(resetArms.length, 2);
      for (const arm of resetArms) {
        assert.strictEqual(arm.alpha, 4);
        assert.strictEqual(arm.beta, 6);
        assert.strictEqual(arm.trialsCount, 0);
        assert.strictEqual(arm.successCount, 0);
        assert.strictEqual(arm.failureCount, 0);
        assert.strictEqual(arm.totalReward, 0);
      }
    });

    it("should advance and reset epochs properly", () => {
      assert.strictEqual(policy.getEpoch(), 0);

      policy.stepEpoch(3);
      assert.strictEqual(policy.getEpoch(), 3);

      policy.stepEpoch();
      assert.strictEqual(policy.getEpoch(), 4);

      policy.resetArms([createMockArm("model:7b", 1, 1)]);
      assert.strictEqual(policy.getEpoch(), 0);
    });
  });
});
