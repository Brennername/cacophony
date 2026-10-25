import {
  BanditPolicyType,
  BanditArmRecord,
  BanditDispatchOutcome,
  EmpiricalRewardFeedback,
  ModelPromotionRecord,
} from "@cacophony/shared-types";

export interface BanditDispatcherOptions {
  readonly explorationRate?: number; // Epsilon [0.05, 0.25], default 0.15
  readonly policy?: BanditPolicyType;
  readonly ucbExplorationConstant?: number; // default sqrt(2) ~ 1.414
  readonly randomSeed?: number;
}

/**
 * BanditTaskScheduler
 *
 * Implements Multi-Armed Bandit dispatching policies:
 * 1. Epsilon-Greedy (Exploit highest historical win rate vs Explore random arm)
 * 2. UCB-1 (Upper Confidence Bound with uncertainty bonus)
 * 3. Thompson Sampling (Bayesian posterior Beta distribution sampling)
 *
 * Includes empirical reward updating and statistical role promotion.
 */
export class BanditTaskScheduler {
  private readonly arms = new Map<string, BanditArmRecord>();
  private readonly promotions: ModelPromotionRecord[] = [];
  private epsilon: number;
  private policy: BanditPolicyType;
  private readonly ucbConstant: number;

  constructor(options: BanditDispatcherOptions = {}) {
    this.epsilon = options.explorationRate ?? 0.15;
    this.policy = options.policy ?? "epsilon_greedy";
    this.ucbConstant = options.ucbExplorationConstant ?? 1.414;
  }

  /**
   * Registers a candidate model arm for a specific agent role.
   */
  public registerArm(
    modelId: string,
    role: string,
    initialAlpha = 2,
    initialBeta = 2,
  ): BanditArmRecord {
    const armId = `${role}:${modelId}`;
    const arm: BanditArmRecord = {
      armId,
      modelId,
      role,
      trialsCount: initialAlpha + initialBeta - 4,
      successCount: initialAlpha - 2,
      failureCount: initialBeta - 2,
      totalReward: 0,
      alpha: initialAlpha,
      beta: initialBeta,
      averageTokensPerSec: 25.0,
      averageVramMb: 4096,
    };
    this.arms.set(armId, arm);
    return arm;
  }

  public getArms(role?: string): BanditArmRecord[] {
    const all = Array.from(this.arms.values());
    return role ? all.filter((a) => a.role === role) : all;
  }

  public setPolicy(policy: BanditPolicyType): void {
    this.policy = policy;
  }

  public setEpsilon(rate: number): void {
    this.epsilon = Math.max(0.01, Math.min(1.0, rate));
  }

  /**
   * Resets all arms' statistical metrics and priors to uniform defaults.
   */
  public resetArms(initialAlpha = 2, initialBeta = 2): void {
    for (const [armId, arm] of this.arms.entries()) {
      this.arms.set(armId, {
        ...arm,
        trialsCount: 0,
        successCount: 0,
        failureCount: 0,
        totalReward: 0,
        alpha: initialAlpha,
        beta: initialBeta,
      });
    }
  }

  /**
   * Resets exploration budget to initial rate.
   */
  public resetExploration(initialEpsilon = 0.15): void {
    this.epsilon = initialEpsilon;
  }

  /**
   * Selects an arm for task execution either by role or from a candidate list.
   * Handles cold starts with no historical data gracefully.
   */
  public selectArm(
    roleOrArms: string | readonly BanditArmRecord[],
    candidateModels?: string[],
  ): BanditDispatchOutcome {
    if (typeof roleOrArms === "string") {
      return this.selectModel(roleOrArms, candidateModels);
    }
    const arms = [...roleOrArms];
    if (arms.length === 0) {
      return this.selectModel("default");
    }
    if (arms.length === 1) {
      const arm = arms[0]!;
      return {
        selectedModel: arm.modelId,
        policy: this.policy,
        isExploratory: false,
        explorationRationale: "Single candidate available",
        armId: arm.armId,
        confidenceScore: this.calculateMeanWinRate(arm),
      };
    }
    switch (this.policy) {
      case "epsilon_greedy":
        return this.selectEpsilonGreedy(arms);
      case "ucb1":
        return this.selectUcb1(arms);
      case "thompson_sampling":
        return this.selectThompsonSampling(arms);
    }
  }

  /**
   * Dispatches the next task to an optimal or exploratory model arm.
   */
  public selectModel(
    role: string,
    candidateModels?: string[],
  ): BanditDispatchOutcome {
    let eligibleArms = this.getArms(role);

    if (candidateModels && candidateModels.length > 0) {
      eligibleArms = eligibleArms.filter((a) =>
        candidateModels.includes(a.modelId),
      );
    }

    if (eligibleArms.length === 0) {
      // Auto-register candidate model if not found
      const fallback = candidateModels?.[0] || "qwen2.5-coder:7b";
      this.registerArm(fallback, role);
      eligibleArms = [this.arms.get(`${role}:${fallback}`)!];
    }

    if (eligibleArms.length === 1) {
      const arm = eligibleArms[0]!;
      return {
        selectedModel: arm.modelId,
        policy: this.policy,
        isExploratory: false,
        explorationRationale: "Single candidate available",
        armId: arm.armId,
        confidenceScore: this.calculateMeanWinRate(arm),
      };
    }

    switch (this.policy) {
      case "epsilon_greedy":
        return this.selectEpsilonGreedy(eligibleArms);
      case "ucb1":
        return this.selectUcb1(eligibleArms);
      case "thompson_sampling":
        return this.selectThompsonSampling(eligibleArms);
    }
  }

  private selectEpsilonGreedy(arms: BanditArmRecord[]): BanditDispatchOutcome {
    const isExploratory = Math.random() < this.epsilon;

    if (isExploratory) {
      // Uniform random exploration
      const sampled = arms[Math.floor(Math.random() * arms.length)]!;
      return {
        selectedModel: sampled.modelId,
        policy: "epsilon_greedy",
        isExploratory: true,
        explorationRationale: `Epsilon-Greedy exploration (rate=${this.epsilon})`,
        armId: sampled.armId,
        confidenceScore: this.calculateMeanWinRate(sampled),
      };
    }

    // Exploit highest average win rate
    arms.sort(
      (a, b) => this.calculateMeanWinRate(b) - this.calculateMeanWinRate(a),
    );
    const best = arms[0]!;

    return {
      selectedModel: best.modelId,
      policy: "epsilon_greedy",
      isExploratory: false,
      explorationRationale: `Epsilon-Greedy exploitation (mean_win_rate=${Math.round(this.calculateMeanWinRate(best) * 100)}%)`,
      armId: best.armId,
      confidenceScore: this.calculateMeanWinRate(best),
    };
  }

  private selectUcb1(arms: BanditArmRecord[]): BanditDispatchOutcome {
    const totalTrials = arms.reduce((acc, a) => acc + a.trialsCount, 0);

    let bestScore = -Infinity;
    let selectedArm = arms[0]!;

    for (const arm of arms) {
      if (arm.trialsCount === 0) {
        // Untested arms receive infinite priority to establish baseline
        return {
          selectedModel: arm.modelId,
          policy: "ucb1",
          isExploratory: true,
          explorationRationale: "UCB-1 zero-trial initial discovery",
          armId: arm.armId,
          confidenceScore: 0.5,
        };
      }

      const mean = this.calculateMeanWinRate(arm);
      const bonus =
        this.ucbConstant *
        Math.sqrt(Math.log(totalTrials + 1) / arm.trialsCount);
      const ucbScore = mean + bonus;

      if (ucbScore > bestScore) {
        bestScore = ucbScore;
        selectedArm = arm;
      }
    }

    return {
      selectedModel: selectedArm.modelId,
      policy: "ucb1",
      isExploratory: selectedArm.trialsCount < totalTrials * 0.3,
      explorationRationale: `UCB-1 uncertainty selection (score=${Math.round(bestScore * 100) / 100})`,
      armId: selectedArm.armId,
      confidenceScore: this.calculateMeanWinRate(selectedArm),
    };
  }

  private selectThompsonSampling(
    arms: BanditArmRecord[],
  ): BanditDispatchOutcome {
    let highestSample = -Infinity;
    let selectedArm = arms[0]!;

    for (const arm of arms) {
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > highestSample) {
        highestSample = sample;
        selectedArm = arm;
      }
    }

    return {
      selectedModel: selectedArm.modelId,
      policy: "thompson_sampling",
      isExploratory: highestSample > this.calculateMeanWinRate(selectedArm),
      explorationRationale: `Thompson Sampling posterior draw (sample=${Math.round(highestSample * 100)}%)`,
      armId: selectedArm.armId,
      confidenceScore: highestSample,
    };
  }

  /**
   * Applies empirical reward feedback and updates Bayesian priors.
   */
  public recordFeedback(feedback: EmpiricalRewardFeedback): void {
    const arm = this.arms.get(feedback.armId);
    if (!arm) return;

    const isSuccess = feedback.reward > 0;
    const newTrials = arm.trialsCount + 1;
    const newSuccess = arm.successCount + (isSuccess ? 1 : 0);
    const newFailure = arm.failureCount + (isSuccess ? 0 : 1);
    const newAlpha = arm.alpha + (isSuccess ? 1 : 0);
    const newBeta = arm.beta + (isSuccess ? 0 : 1);
    const newReward = arm.totalReward + feedback.reward;

    const avgTokens = Math.round(
      (arm.averageTokensPerSec * arm.trialsCount + feedback.tokensPerSec) /
        newTrials,
    );
    const avgVram = Math.round(
      (arm.averageVramMb * arm.trialsCount + feedback.vramMb) / newTrials,
    );

    const updated: BanditArmRecord = {
      ...arm,
      trialsCount: newTrials,
      successCount: newSuccess,
      failureCount: newFailure,
      totalReward: Math.round(newReward * 100) / 100,
      alpha: newAlpha,
      beta: newBeta,
      averageTokensPerSec: avgTokens,
      averageVramMb: avgVram,
      lastSelectedAt: new Date().toISOString(),
    };

    this.arms.set(feedback.armId, updated);
  }

  /**
   * Records a task execution reward for an arm selection.
   * Handles edge cases gracefully where the arm or task ID does not exist.
   * Returns true if successfully recorded, or false if rejected due to missing parameters.
   */
  public recordReward(
    taskId: string,
    armId: string,
    reward: number,
    options?: Partial<Omit<EmpiricalRewardFeedback, "taskId" | "armId" | "reward">>,
  ): boolean {
    if (!taskId || taskId.trim().length === 0) {
      return false;
    }
    if (!armId || !this.arms.has(armId)) {
      return false;
    }
    const arm = this.arms.get(armId)!;
    const feedback: EmpiricalRewardFeedback = {
      taskId,
      armId,
      reward,
      executionOutcome:
        options?.executionOutcome ??
        (reward > 0 ? "clean_first_pass" : "test_assertion_failed"),
      durationMs: options?.durationMs ?? 1000,
      tokensPerSec: options?.tokensPerSec ?? arm.averageTokensPerSec,
      vramMb: options?.vramMb ?? arm.averageVramMb,
    };
    this.recordFeedback(feedback);
    return true;
  }

  /**
   * Tracks and evaluates model convergence for registered arms within a role.
   * Stagnation or plateau occurs when top arm variance collapses or sample size threshold is met.
   */
  public getConvergenceStatus(
    role?: string,
    options?: { minTrials?: number; convergenceEpsilon?: number },
  ): {
    readonly isConverged: boolean;
    readonly totalTrials: number;
    readonly meanWinRate: number;
    readonly bestArmId: string | null;
    readonly plateauDetected: boolean;
    readonly rationale: string;
  } {
    const arms = this.getArms(role);
    const minTrials = options?.minTrials ?? 10;
    const epsilon = options?.convergenceEpsilon ?? 0.05;

    if (arms.length === 0) {
      return {
        isConverged: false,
        totalTrials: 0,
        meanWinRate: 0,
        bestArmId: null,
        plateauDetected: false,
        rationale: "No registered arms for convergence analysis.",
      };
    }

    const totalTrials = arms.reduce((sum, a) => sum + a.trialsCount, 0);
    if (totalTrials < minTrials) {
      return {
        isConverged: false,
        totalTrials,
        meanWinRate: 0,
        bestArmId: null,
        plateauDetected: false,
        rationale: `Insufficient trial count (${totalTrials} < ${minTrials}) to determine convergence.`,
      };
    }

    const sorted = [...arms].sort(
      (a, b) => this.calculateMeanWinRate(b) - this.calculateMeanWinRate(a),
    );
    const best = sorted[0]!;
    const bestRate = this.calculateMeanWinRate(best);

    if (sorted.length > 1) {
      const runnerUp = sorted[1]!;
      const runnerUpRate = this.calculateMeanWinRate(runnerUp);
      const gap = bestRate - runnerUpRate;

      const plateauDetected =
        gap < epsilon && best.trialsCount >= 5 && runnerUp.trialsCount >= 5;
      const isConverged =
        gap >= epsilon * 2 || (best.trialsCount > 20 && bestRate > 0.7);

      return {
        isConverged,
        totalTrials,
        meanWinRate: bestRate,
        bestArmId: best.armId,
        plateauDetected,
        rationale: isConverged
          ? `Model convergence achieved with best arm ${best.armId} (win rate=${Math.round(bestRate * 100)}%).`
          : `Convergence criteria not met: top arms difference (${Math.round(gap * 100)}%) is insufficient or trials ongoing.`,
      };
    }

    return {
      isConverged: best.trialsCount >= minTrials,
      totalTrials,
      meanWinRate: bestRate,
      bestArmId: best.armId,
      plateauDetected: false,
      rationale: `Single arm ${best.armId} reached ${best.trialsCount} trials.`,
    };
  }

  /**
   * Monitors arm performance and triggers interventions (e.g. exploration boost) if stagnation occurs.
   * Handles edge cases gracefully where no interventions are needed.
   */
  public monitorPerformanceAndIntervene(
    role?: string,
    options?: { minWinRateThreshold?: number; autoResetExploration?: boolean },
  ): {
    readonly interventionNeeded: boolean;
    readonly interventionType:
      | "NONE"
      | "EXPLORATION_BOOST"
      | "RESET_ARMS"
      | "ROLE_PROMOTION";
    readonly details: string;
  } {
    const minThreshold = options?.minWinRateThreshold ?? 0.35;
    const arms = this.getArms(role);

    if (arms.length === 0) {
      return {
        interventionNeeded: false,
        interventionType: "NONE",
        details: "No active arms found; no interventions required.",
      };
    }

    const totalTrials = arms.reduce((sum, a) => sum + a.trialsCount, 0);
    if (totalTrials < 5) {
      return {
        interventionNeeded: false,
        interventionType: "NONE",
        details: "Insufficient observations (< 5 trials) to trigger interventions.",
      };
    }

    const winRates = arms.map((a) => this.calculateMeanWinRate(a));
    const maxWinRate = Math.max(...winRates);

    if (maxWinRate < minThreshold && totalTrials >= 10) {
      if (options?.autoResetExploration) {
        this.resetExploration(0.35);
      }
      return {
        interventionNeeded: true,
        interventionType: "EXPLORATION_BOOST",
        details: `All arms performing below threshold (${Math.round(maxWinRate * 100)}% < ${Math.round(minThreshold * 100)}%). Triggered exploration boost intervention.`,
      };
    }

    return {
      interventionNeeded: false,
      interventionType: "NONE",
      details: `Performance healthy (top arm win rate ${Math.round(maxWinRate * 100)}%). No interventions needed.`,
    };
  }
  public evaluateRolePromotion(
    role: string,
    currentPrimaryModel: string,
  ): ModelPromotionRecord | null {
    const roleArms = this.getArms(role);
    const incumbent = roleArms.find((a) => a.modelId === currentPrimaryModel);
    if (!incumbent || incumbent.trialsCount < 10) return null;

    const incumbentWinRate = this.calculateMeanWinRate(incumbent);

    for (const challenger of roleArms) {
      if (
        challenger.modelId === currentPrimaryModel ||
        challenger.trialsCount < 10
      ) {
        continue;
      }

      const challengerWinRate = this.calculateMeanWinRate(challenger);
      if (challengerWinRate > incumbentWinRate) {
        // Binomial test / Z-score approximation
        const delta = challengerWinRate - incumbentWinRate;
        const pooled =
          (challenger.successCount + incumbent.successCount) /
          (challenger.trialsCount + incumbent.trialsCount);
        const se = Math.sqrt(
          pooled *
            (1 - pooled) *
            (1 / challenger.trialsCount + 1 / incumbent.trialsCount),
        );
        const z = se > 0 ? delta / se : 0;
        const pValue = Math.max(0.001, 1 - this.approximatePhi(z));

        if (pValue < 0.05 && delta > 0.08) {
          const promo: ModelPromotionRecord = {
            id: `promo_${Date.now()}`,
            role,
            previousModel: incumbent.modelId,
            promotedModel: challenger.modelId,
            winRateDeltaPct: Math.round(delta * 10000) / 100,
            pValue: Math.round(pValue * 1000) / 1000,
            sampleSize: challenger.trialsCount,
            promotedAt: new Date().toISOString(),
            rationale: `Challenger win rate (${Math.round(challengerWinRate * 100)}%) statistically outperforms incumbent (${Math.round(incumbentWinRate * 100)}%) with p=${Math.round(pValue * 1000) / 1000}`,
          };
          this.promotions.push(promo);
          return promo;
        }
      }
    }

    return null;
  }

  private calculateMeanWinRate(arm: BanditArmRecord): number {
    return arm.alpha / (arm.alpha + arm.beta);
  }

  /**
   * Beta distribution sampler using Gamma generator approximation.
   */
  private sampleBeta(alpha: number, beta: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const x = Math.pow(-Math.log(u1 || 0.0001), 1 / alpha);
    const y = Math.pow(-Math.log(u2 || 0.0001), 1 / beta);
    return x / (x + y);
  }

  /**
   * Standard normal cumulative distribution approximation (Phi).
   */
  private approximatePhi(z: number): number {
    return 1 / (1 + Math.exp(-0.07056 * Math.pow(z, 3) - 1.5976 * z));
  }
}
