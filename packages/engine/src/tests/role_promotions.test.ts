import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BanditTaskScheduler } from "../bandit/BanditTaskScheduler.js";

describe("Bandit Statistical Role Promotion Suite (T55.5.4)", () => {
  it("should promote superior model arm when empirical win rate statistically outperforms baseline", () => {
    const scheduler = new BanditTaskScheduler({
      policy: "epsilon_greedy",
      explorationRate: 0.1,
    });

    const baselineModel = "qwen2.5-coder:7b";
    const challengerModel = "deepseek-r1:8b";
    const role = "implementer";

    const baselineArm = scheduler.registerArm(baselineModel, role, 2, 2);
    const challengerArm = scheduler.registerArm(challengerModel, role, 2, 2);

    // Simulate 30 trials for baseline model with low success rate (~30%)
    for (let i = 0; i < 30; i++) {
      const success = i < 9;
      scheduler.recordFeedback({
        taskId: `baseline-task-${i}`,
        armId: baselineArm.armId,
        reward: success ? 1.0 : 0.0,
        executionOutcome: success
          ? "clean_first_pass"
          : "test_assertion_failed",
        durationMs: 1200,
        tokensPerSec: 24,
        vramMb: 4096,
      });
    }

    // Simulate 30 trials for challenger model with high success rate (~90%)
    for (let i = 0; i < 30; i++) {
      const success = i < 27;
      scheduler.recordFeedback({
        taskId: `challenger-task-${i}`,
        armId: challengerArm.armId,
        reward: success ? 1.0 : 0.0,
        executionOutcome: success
          ? "clean_first_pass"
          : "test_assertion_failed",
        durationMs: 900,
        tokensPerSec: 32,
        vramMb: 4096,
      });
    }

    // Evaluate promotion
    const promotion = scheduler.evaluateRolePromotion(role, baselineModel);
    assert.ok(
      promotion,
      "Superior challenger should earn promotion over baseline",
    );
    assert.strictEqual(promotion.previousModel, baselineModel);
    assert.strictEqual(promotion.promotedModel, challengerModel);
    assert.ok(
      promotion.pValue < 0.05,
      `p-value (${promotion.pValue}) must be statistically significant (< 0.05)`,
    );
    assert.ok(
      promotion.winRateDeltaPct > 8,
      `Win rate delta (${promotion.winRateDeltaPct}%) must exceed minimum delta threshold`,
    );
  });

  it("should not promote when trials count is insufficient or win rate is parity", () => {
    const scheduler = new BanditTaskScheduler({
      policy: "epsilon_greedy",
      explorationRate: 0.1,
    });

    const baselineModel = "qwen2.5-coder:7b";
    const challengerModel = "deepseek-r1:8b";
    const role = "architect";

    const baselineArm = scheduler.registerArm(baselineModel, role, 2, 2);
    const challengerArm = scheduler.registerArm(challengerModel, role, 2, 2);

    // Only 5 trials each (below minimum 10 trials threshold)
    for (let i = 0; i < 5; i++) {
      scheduler.recordFeedback({
        taskId: `task-${i}`,
        armId: baselineArm.armId,
        reward: 1.0,
        executionOutcome: "clean_first_pass",
        durationMs: 1000,
        tokensPerSec: 25,
        vramMb: 4096,
      });
      scheduler.recordFeedback({
        taskId: `task-${i}`,
        armId: challengerArm.armId,
        reward: 1.0,
        executionOutcome: "clean_first_pass",
        durationMs: 1000,
        tokensPerSec: 25,
        vramMb: 4096,
      });
    }

    const promotion = scheduler.evaluateRolePromotion(role, baselineModel);
    assert.strictEqual(
      promotion,
      null,
      "Should not promote with insufficient sample size",
    );
  });
});
