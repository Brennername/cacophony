import type {
  BanditArmRecord,
  BanditDispatchOutcome,
  EpsilonGreedyConfig,
  IBanditPolicy,
  BanditPolicyType,
} from "@cacophony/shared-types";

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

  public stepEpoch(epochsToAdvance = 1): number {
    this.currentEpoch += epochsToAdvance;
    this.currentEpsilon = Math.max(
      this.minEpsilon,
      this.initialEpsilon * Math.pow(this.decayRate, this.currentEpoch)
    );
    return this.currentEpsilon;
  }

  public resetExploration(): void {
    this.currentEpoch = 0;
    this.currentEpsilon = this.initialEpsilon;
  }

  public getEpsilon(): number {
    return this.currentEpsilon;
  }

  public getEpoch(): number {
    return this.currentEpoch;
  }

  public calculateMeanWinRate(arm: BanditArmRecord): number {
    if (arm.trialsCount <= 0) {
      return arm.alpha / (arm.alpha + arm.beta);
    }
    return arm.successCount / arm.trialsCount;
  }
}
