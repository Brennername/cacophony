import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BanditTaskScheduler } from "../bandit/BanditTaskScheduler.js";

describe("BanditTaskScheduler Test Suite", () => {
  describe("Arm Selection", () => {
    it("should select an arm based on the current state", () => {
      const scheduler = new BanditTaskScheduler({ explorationRate: 0.0 });
      scheduler.registerArm("qwen2.5-coder:7b", "coder", 8, 2);
      scheduler.registerArm("deepseek-r1:8b", "coder", 3, 7);

      const outcome = scheduler.selectArm("coder");
      assert.ok(outcome);
      assert.equal(outcome.selectedModel, "qwen2.5-coder:7b");
      assert.equal(outcome.armId, "coder:qwen2.5-coder:7b");
      assert.equal(outcome.isExploratory, false);
      assert.ok(outcome.confidenceScore > 0.5);
    });

    it("should select the best arm based on historical data", () => {
      const scheduler = new BanditTaskScheduler({ explorationRate: 0.0 });
      // Model A: 90% win rate (alpha=10, beta=1)
      scheduler.registerArm("model-high-win:7b", "reviewer", 10, 1);
      // Model B: 30% win rate (alpha=4, beta=9)
      scheduler.registerArm("model-low-win:7b", "reviewer", 4, 9);

      const outcome = scheduler.selectArm("reviewer");
      assert.equal(outcome.selectedModel, "model-high-win:7b");
      assert.equal(outcome.isExploratory, false);
      assert.ok(outcome.confidenceScore >= 0.8);
    });

    it("should handle no historical data gracefully", () => {
      const scheduler = new BanditTaskScheduler();
      // Cold start: no arms pre-registered for the role
      const outcome = scheduler.selectArm("unseen-role");
      assert.ok(outcome);
      assert.ok(outcome.selectedModel.length > 0);
      assert.ok(outcome.armId.startsWith("unseen-role:"));

      const registered = scheduler.getArms("unseen-role");
      assert.equal(registered.length, 1);
      assert.equal(registered[0]?.trialsCount, 0);
    });

    it("should select candidate models when explicit candidate list is provided", () => {
      const scheduler = new BanditTaskScheduler({ explorationRate: 0.0 });
      scheduler.registerArm("model-a:7b", "coder", 5, 5);
      scheduler.registerArm("model-b:7b", "coder", 8, 2);
      scheduler.registerArm("model-c:7b", "coder", 10, 1);

      // Restrict candidates to model-a and model-b only
      const outcome = scheduler.selectArm("coder", ["model-a:7b", "model-b:7b"]);
      assert.equal(outcome.selectedModel, "model-b:7b");
    });
  });

  describe("Reward Recording", () => {
    it("should record a reward for a successful arm selection", () => {
      const scheduler = new BanditTaskScheduler();
      const arm = scheduler.registerArm("candidate:7b", "tester", 2, 2);

      const recorded = scheduler.recordReward("task-100", arm.armId, 1.0, {
        tokensPerSec: 35.0,
        vramMb: 4000,
        durationMs: 950,
      });

      assert.equal(recorded, true);
      const arms = scheduler.getArms("tester");
      const updated = arms.find((a) => a.armId === arm.armId);
      assert.ok(updated);
      assert.equal(updated.trialsCount, 1);
      assert.equal(updated.successCount, 1);
      assert.equal(updated.failureCount, 0);
      assert.equal(updated.totalReward, 1.0);
      assert.equal(updated.alpha, 3);
      assert.equal(updated.beta, 2);
    });

    it("should record a penalty reward for a failed arm selection", () => {
      const scheduler = new BanditTaskScheduler();
      const arm = scheduler.registerArm("flaky-candidate:7b", "tester", 2, 2);

      const recorded = scheduler.recordReward("task-101", arm.armId, -1.0, {
        tokensPerSec: 20.0,
        vramMb: 4200,
        executionOutcome: "test_assertion_failed",
      });

      assert.equal(recorded, true);
      const arms = scheduler.getArms("tester");
      const updated = arms.find((a) => a.armId === arm.armId);
      assert.ok(updated);
      assert.equal(updated.trialsCount, 1);
      assert.equal(updated.successCount, 0);
      assert.equal(updated.failureCount, 1);
      assert.equal(updated.alpha, 2);
      assert.equal(updated.beta, 3);
    });

    it("should handle edge cases where the arm is not recognized", () => {
      const scheduler = new BanditTaskScheduler();
      scheduler.registerArm("valid:7b", "coder");

      const recorded = scheduler.recordReward("task-102", "nonexistent:arm", 1.0);
      assert.equal(recorded, false, "Expected false when recording reward for unrecognized arm");
    });

    it("should handle edge cases where the task ID does not exist", () => {
      const scheduler = new BanditTaskScheduler();
      const arm = scheduler.registerArm("valid:7b", "coder");

      const emptyTaskIdRecorded = scheduler.recordReward("", arm.armId, 1.0);
      assert.equal(emptyTaskIdRecorded, false, "Expected false when task ID is empty");

      const whitespaceTaskIdRecorded = scheduler.recordReward("   ", arm.armId, 1.0);
      assert.equal(whitespaceTaskIdRecorded, false, "Expected false when task ID is whitespace");
    });
  });

  describe("Model Performance Convergence", () => {
    it("should track and report model performance convergence", () => {
      const scheduler = new BanditTaskScheduler();
      const dominantArm = scheduler.registerArm("dominant:7b", "architect", 25, 3);
      scheduler.registerArm("lagging:7b", "architect", 5, 20);

      // Dominant arm has high trials (24 trials) and high win rate (89%)
      const status = scheduler.getConvergenceStatus("architect", { minTrials: 10 });
      assert.equal(status.isConverged, true);
      assert.equal(status.bestArmId, dominantArm.armId);
      assert.ok(status.meanWinRate > 0.8);
      assert.ok(status.rationale.includes("convergence achieved"));
    });

    it("should handle edge cases where convergence criteria are not met", () => {
      const scheduler = new BanditTaskScheduler();
      // Only 2 trials total - well below minTrials requirement
      scheduler.registerArm("new-model-a:7b", "architect", 3, 2);
      scheduler.registerArm("new-model-b:7b", "architect", 2, 3);

      const status = scheduler.getConvergenceStatus("architect", { minTrials: 10 });
      assert.equal(status.isConverged, false);
      assert.ok(status.rationale.includes("Insufficient trial count"));
    });

    it("should report non-convergence when no arms exist for role", () => {
      const scheduler = new BanditTaskScheduler();
      const status = scheduler.getConvergenceStatus("empty-role");
      assert.equal(status.isConverged, false);
      assert.equal(status.bestArmId, null);
      assert.ok(status.rationale.includes("No registered arms"));
    });
  });

  describe("Interventions and Performance Monitoring", () => {
    it("should monitor model performance and trigger interventions if necessary", () => {
      const scheduler = new BanditTaskScheduler({ explorationRate: 0.1 });
      // Register arms that have accumulated severe failures (all win rates < 20%)
      scheduler.registerArm("failing-a:7b", "reviewer", 2, 15);
      scheduler.registerArm("failing-b:7b", "reviewer", 2, 14);

      const result = scheduler.monitorPerformanceAndIntervene("reviewer", {
        minWinRateThreshold: 0.35,
        autoResetExploration: true,
      });

      assert.equal(result.interventionNeeded, true);
      assert.equal(result.interventionType, "EXPLORATION_BOOST");
      assert.ok(result.details.includes("Triggered exploration boost intervention"));
    });

    it("should handle edge cases where no interventions are needed", () => {
      const scheduler = new BanditTaskScheduler();
      scheduler.registerArm("healthy-a:7b", "coder", 15, 3); // 83% win rate
      scheduler.registerArm("healthy-b:7b", "coder", 12, 5); // 70% win rate

      const result = scheduler.monitorPerformanceAndIntervene("coder", {
        minWinRateThreshold: 0.35,
      });

      assert.equal(result.interventionNeeded, false);
      assert.equal(result.interventionType, "NONE");
      assert.ok(result.details.includes("Performance healthy"));
    });

    it("should handle edge cases where arms have insufficient observations for intervention", () => {
      const scheduler = new BanditTaskScheduler();
      scheduler.registerArm("brand-new:7b", "coder", 2, 2); // 0 trials

      const result = scheduler.monitorPerformanceAndIntervene("coder");
      assert.equal(result.interventionNeeded, false);
      assert.equal(result.interventionType, "NONE");
      assert.ok(result.details.includes("Insufficient observations"));
    });
  });

  describe("Statistical Role Promotion", () => {
    it("should evaluate and trigger role promotion when challenger statistically outperforms incumbent", () => {
      const scheduler = new BanditTaskScheduler();
      const incumbent = scheduler.registerArm("incumbent:7b", "coder", 10, 20); // 10/30 = 33%
      scheduler.registerArm("challenger:7b", "coder", 28, 2); // 28/30 = 93%

      const promo = scheduler.evaluateRolePromotion("coder", incumbent.modelId);
      assert.ok(promo);
      assert.equal(promo.previousModel, "incumbent:7b");
      assert.equal(promo.promotedModel, "challenger:7b");
      assert.ok(promo.pValue < 0.05);
      assert.ok(promo.winRateDeltaPct > 0.08);
    });

    it("should return null for role promotion when sample size is insufficient", () => {
      const scheduler = new BanditTaskScheduler();
      const incumbent = scheduler.registerArm("incumbent:7b", "coder", 3, 2); // 1 trial
      scheduler.registerArm("challenger:7b", "coder", 4, 1); // 1 trial

      const promo = scheduler.evaluateRolePromotion("coder", incumbent.modelId);
      assert.equal(promo, null);
    });
  });
});
