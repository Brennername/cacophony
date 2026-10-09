import type {
  BanditArmRecord,
  BanditDispatchOutcome,
  IBanditPolicy,
  BanditPolicyType,
} from "@cacophony/shared-types";

export interface ThompsonSamplingConfig {
  readonly uniformPriorAlpha?: number;
  readonly uniformPriorBeta?: number;
}

export class ThompsonSamplingPolicy implements IBanditPolicy {
  public readonly policyType: BanditPolicyType = "thompson_sampling";
  private readonly defaultAlpha: number;
  private readonly defaultBeta: number;
  private currentEpoch: number = 0;

  constructor(config: ThompsonSamplingConfig = {}) {
    this.defaultAlpha = config.uniformPriorAlpha ?? 2;
    this.defaultBeta = config.uniformPriorBeta ?? 2;
  }

  public selectArm(arms: readonly BanditArmRecord[]): BanditDispatchOutcome {
    if (!arms || arms.length === 0) {
      throw new Error("No bandit arms available for selection");
    }

    let highestSample = -Infinity;
    let selectedArm = arms[0]!;

    for (const arm of arms) {
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > highestSample) {
        highestSample = sample;
        selectedArm = arm;
      }
    }

    const meanRate = this.calculateMeanWinRate(selectedArm);
    return {
      selectedModel: selectedArm.modelId,
      policy: this.policyType,
      isExploratory: highestSample > meanRate,
      explorationRationale: `Thompson Sampling posterior draw (sample=${Math.round(highestSample * 100)}%)`,
      armId: selectedArm.armId,
      confidenceScore: highestSample,
    };
  }

  public resetArms(arms: readonly BanditArmRecord[]): BanditArmRecord[] {
    this.currentEpoch = 0;
    return arms.map((arm) => ({
      ...arm,
      alpha: this.defaultAlpha,
      beta: this.defaultBeta,
      trialsCount: 0,
      successCount: 0,
      failureCount: 0,
      totalReward: 0,
    }));
  }

  public stepEpoch(epochsToAdvance = 1): number {
    this.currentEpoch += epochsToAdvance;
    return this.currentEpoch;
  }

  public getEpoch(): number {
    return this.currentEpoch;
  }

  public calculateMeanWinRate(arm: BanditArmRecord): number {
    const denom = arm.alpha + arm.beta;
    return denom > 0 ? arm.alpha / denom : 0.5;
  }

  private sampleBeta(alpha: number, beta: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const x = Math.pow(-Math.log(u1 || 0.0001), 1 / Math.max(0.01, alpha));
    const y = Math.pow(-Math.log(u2 || 0.0001), 1 / Math.max(0.01, beta));
    return x / (x + y);
  }
}
