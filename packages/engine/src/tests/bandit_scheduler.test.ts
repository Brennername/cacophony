import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BanditTaskScheduler } from "../bandit/index.js";
import { EmpiricalRewardFeedback } from "@cacophony/shared-types";

describe("Phase 28: Stochastic Exploration Scheduler & Multi-Armed Bandit Dispatcher", () => {
  describe("T28.1: Multi-Armed Bandit Scheduling & Epsilon-Greedy Dispatcher", () => {
    it("should register arms and perform Epsilon-Greedy exploitation vs exploration", () => {
      const scheduler = new BanditTaskScheduler({ explorationRate: 0.0 }); // 100% exploitation
      scheduler.registerArm("qwen2.5-coder:7b", "coder", 10, 2); // 83% win rate
      scheduler.registerArm("deepseek-r1:8b", "coder", 4, 8);   // 33% win rate

      const outcome = scheduler.selectModel("coder");
      assert.equal(outcome.selectedModel, "qwen2.5-coder:7b");
      assert.equal(outcome.isExploratory, false);

      // Force 100% exploration
      scheduler.setEpsilon(1.0);
      const exploreOutcome = scheduler.selectModel("coder");
      assert.equal(exploreOutcome.isExploratory, true);
    });

    it("should select arms via UCB-1 with uncertainty bonus for unmeasured arms", () => {
      const scheduler = new BanditTaskScheduler({ policy: "ucb1" });
      scheduler.registerArm("known-model:7b", "reviewer", 20, 5); // 25 trials
      scheduler.registerArm("unknown-model:7b", "reviewer", 2, 2); // 0 trials (alpha=2, beta=2)

      const outcome = scheduler.selectModel("reviewer");
      // Untested arm with 0 trials must be prioritized by UCB-1
      assert.equal(outcome.selectedModel, "unknown-model:7b");
      assert.equal(outcome.isExploratory, true);
    });

    it("should select arms via Thompson Sampling posterior draw", () => {
      const scheduler = new BanditTaskScheduler({ policy: "thompson_sampling" });
      scheduler.registerArm("qwen2.5-coder:7b", "architect", 15, 2);
      scheduler.registerArm("gemma3:4b", "architect", 3, 10);

      const outcome = scheduler.selectModel("architect");
      assert.ok(["qwen2.5-coder:7b", "gemma3:4b"].includes(outcome.selectedModel));
      assert.equal(outcome.policy, "thompson_sampling");
    });
  });

  describe("T28.2: Empirical Reward Function & Dynamic Promotion Engine", () => {
    it("should update Bayesian priors and trial counts on empirical feedback", () => {
      const scheduler = new BanditTaskScheduler();
      const arm = scheduler.registerArm("candidate:7b", "tester", 2, 2);

      const feedback: EmpiricalRewardFeedback = {
        taskId: "task-001",
        armId: arm.armId,
        reward: 1.0,
        executionOutcome: "clean_first_pass",
        durationMs: 1200,
        tokensPerSec: 32.5,
        vramMb: 4120,
      };

      scheduler.recordFeedback(feedback);

      const arms = scheduler.getArms("tester");
      const updated = arms.find((a) => a.armId === arm.armId);
      assert.ok(updated);
      assert.equal(updated.trialsCount, 1);
      assert.equal(updated.successCount, 1);
      assert.equal(updated.alpha, 3);
      assert.equal(updated.beta, 2);
    });

    it("should trigger statistical role promotion when challenger significantly outperforms incumbent", () => {
      const scheduler = new BanditTaskScheduler();
      const incumbent = scheduler.registerArm("old-incumbent:7b", "coder", 12, 18); // 12/30 = 40%
      scheduler.registerArm("new-challenger:7b", "coder", 27, 3); // 27/30 = 90%

      const promotion = scheduler.evaluateRolePromotion("coder", incumbent.modelId);
      assert.ok(promotion);
      assert.equal(promotion.role, "coder");
      assert.equal(promotion.previousModel, "old-incumbent:7b");
      assert.equal(promotion.promotedModel, "new-challenger:7b");
      assert.ok(promotion.pValue < 0.05);
      assert.ok(promotion.winRateDeltaPct > 0.08);
    });
  });
});
