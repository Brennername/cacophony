import type {
  BanditArmRecord,
  BanditDispatchOutcome,
  EpsilonGreedyConfig,
  IBanditPolicy,
  BanditPolicyType,
} from "@cacophony/shared-types";

/**
 * EpsilonGreedyPolicy
 *
 * Implements Multi-Armed Bandit exploration:
 * - With probability epsilon: selects an arm uniformly at random (exploration)
 * - With probability (1 - epsilon): selects arm with highest empirical mean win rate (exploitation)
 * - Exponential decay: epsilon = max(minEpsilon, initialEpsilon * (decayRate ^ epoch))
 */
export class EpsilonGreedyPolicy implements IBanditPolicy {
  public readonly policyType: BanditPolicyType = "epsilon_greedy";
  private readonly initialEpsilon: number;
  private readonly minEpsilon: number;
  private readonly decayRate: number;
  private currentEpsilon: number;
  private currentEpoch: number = 0;

  constructor(config: EpsilonGreedyConfig = {}) {
    this.initialEpsilon = config.initialEpsilon ?? 0.2;
    this.minEpsilon = config.minEpsilon ?? 0.05;
    this.decayRate = config.decayRate ?? 0.995;
    this.currentEpsilon = this.initialEpsilon;
  }

  /**
   * Selects an arm using epsilon-greedy exploration vs exploitation.
   *
   * @param arms The candidate arms to choose from.
   * @returns BanditDispatchOutcome describing chosen arm and rationale.
   */
  public selectArm(arms: readonly BanditArmRecord[]): BanditDispatchOutcome {
    if (!arms || arms.length === 0) {
      throw new Error("No bandit arms available for selection");
    }

    const isExploratory = Math.random() < this.currentEpsilon;

    if (isExploratory) {
      const sampled = arms[Math.floor(Math.random() * arms.length)]!;
      return {
        selectedModel: sampled.modelId,
        policy: this.policyType,
        isExploratory: true,
        explorationRationale: `Epsilon-Greedy exploration (rate=${this.currentEpsilon.toFixed(3)})`,
        armId: sampled.armId,
        confidenceScore: this.calculateMeanWinRate(sampled),
      };
    }

    const sorted = [...arms].sort(
      (a, b) => this.calculateMeanWinRate(b) - this.calculateMeanWinRate(a)
    );
    const best = sorted[0]!;

    return {
      selectedModel: best.modelId,
      policy: this.policyType,
      isExploratory: false,
      explorationRationale: `Epsilon-Greedy exploitation (mean_win_rate=${Math.round(this.calculateMeanWinRate(best) * 100)}%)`,
      armId: best.armId,
      confidenceScore: this.calculateMeanWinRate(best),
    };
  }

  /**
   * Advances epoch and applies exponential epsilon decay.
   * Formula: epsilon = max(minEpsilon, initialEpsilon * (decayRate ^ epoch))
   */
  public stepEpoch(epochsToAdvance = 1): number {
    this.currentEpoch += epochsToAdvance;
    this.currentEpsilon = Math.max(
      this.minEpsilon,
      this.initialEpsilon * Math.pow(this.decayRate, this.currentEpoch)
    );
    return this.currentEpsilon;
  }

  /**
   * Resets exploration budget to initialEpsilon for a new training/dispatch epoch.
   */
  public resetExploration(): void {
    this.currentEpoch = 0;
    this.currentEpsilon = this.initialEpsilon;
  }

  /**
   * Returns current active exploration rate.
   */
  public getEpsilon(): number {
    return this.currentEpsilon;
  }

  /**
   * Returns current epoch index.
   */
  public getEpoch(): number {
    return this.currentEpoch;
  }

  /**
   * Calculates empirical mean win rate for an arm.
   */
  public calculateMeanWinRate(arm: BanditArmRecord): number {
    if (arm.trialsCount <= 0) {
      return arm.alpha / (arm.alpha + arm.beta);
    }
    return arm.successCount / arm.trialsCount;
  }
}
