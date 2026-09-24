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
  public registerArm(modelId: string, role: string, initialAlpha = 2, initialBeta = 2): BanditArmRecord {
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
   * Dispatches the next task to an optimal or exploratory model arm.
   */
  public selectModel(role: string, candidateModels?: string[]): BanditDispatchOutcome {
    let eligibleArms = this.getArms(role);

    if (candidateModels && candidateModels.length > 0) {
      eligibleArms = eligibleArms.filter((a) => candidateModels.includes(a.modelId));
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
    arms.sort((a, b) => this.calculateMeanWinRate(b) - this.calculateMeanWinRate(a));
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
      const bonus = this.ucbConstant * Math.sqrt(Math.log(totalTrials + 1) / arm.trialsCount);
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

  private selectThompsonSampling(arms: BanditArmRecord[]): BanditDispatchOutcome {
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
      (arm.averageTokensPerSec * arm.trialsCount + feedback.tokensPerSec) / newTrials
    );
    const avgVram = Math.round(
      (arm.averageVramMb * arm.trialsCount + feedback.vramMb) / newTrials
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
   * Evaluates role promotion: If exploratory arm significantly beats incumbent (p < 0.05).
   */
  public evaluateRolePromotion(role: string, currentPrimaryModel: string): ModelPromotionRecord | null {
    const roleArms = this.getArms(role);
    const incumbent = roleArms.find((a) => a.modelId === currentPrimaryModel);
    if (!incumbent || incumbent.trialsCount < 10) return null;

    const incumbentWinRate = this.calculateMeanWinRate(incumbent);

    for (const challenger of roleArms) {
      if (challenger.modelId === currentPrimaryModel || challenger.trialsCount < 10) {
        continue;
      }

      const challengerWinRate = this.calculateMeanWinRate(challenger);
      if (challengerWinRate > incumbentWinRate) {
        // Binomial test / Z-score approximation
        const delta = challengerWinRate - incumbentWinRate;
        const pooled = (challenger.successCount + incumbent.successCount) /
                       (challenger.trialsCount + incumbent.trialsCount);
        const se = Math.sqrt(pooled * (1 - pooled) * (1 / challenger.trialsCount + 1 / incumbent.trialsCount));
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
