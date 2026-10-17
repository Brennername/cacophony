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

/**
 * Implements the Thompson Sampling bandit policy. This policy samples from a Beta distribution
 * for each arm and selects the arm with the highest sample value. The alpha and beta parameters
 * of the Beta distribution are updated based on the observed rewards (successes/failures) for each arm.
 */
export class ThompsonSamplingPolicy implements IBanditPolicy {
  public readonly policyType: BanditPolicyType = "thompson_sampling";
  private readonly defaultAlpha: number;
  private readonly defaultBeta: number;
  private currentEpoch: number = 0;

  /**
   * Constructs a new ThompsonSamplingPolicy.
   * @param config Configuration options for the policy, including prior alpha and beta values.
   */
  constructor(config: ThompsonSamplingConfig = {}) {
    this.defaultAlpha = config.uniformPriorAlpha ?? 2; // Default to Beta(2, 2) - uniform prior
    this.defaultBeta = config.uniformPriorBeta ?? 2;
  }

  /**
   * Selects an arm based on Thompson Sampling. Samples from the Beta distribution for each arm and selects the arm with the highest sample value.
   * @param arms An array of BanditArmRecord objects representing the available arms.
   * @returns A BanditDispatchOutcome object containing information about the selected arm, including its ID, policy type, exploration status, rationale, and confidence score.
   * @throws Error if no arms are provided for selection.
   */
  public selectArm(arms: readonly BanditArmRecord[]): BanditDispatchOutcome {
    if (!arms || arms.length === 0) {
      throw new Error("No bandit arms available for selection");
    }

    let highestSample = -Infinity;
    let selectedArm = arms[0]!; // Initialize with the first arm in case all samples are negative

    for (const arm of arms) {
      // Sample from Beta distribution using alpha and beta parameters.
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      if (sample > highestSample) {
        highestSample = sample;
        selectedArm = arm;
      }
    }

    // Calculate the mean win rate for the selected arm.
    const meanRate = this.calculateMeanWinRate(selectedArm);

    return {
      selectedModel: selectedArm.modelId,
      policy: this.policyType,
      isExploratory: highestSample > meanRate, // Flag as exploratory if sample is higher than the mean win rate
      explorationRationale: `Thompson Sampling posterior draw (sample=${Math.round(highestSample * 100)}%)`,
      armId: selectedArm.armId,
      confidenceScore: highestSample, // Confidence score based on the sampled value
    };
  }

  /**
   * Resets the alpha and beta parameters of all arms to their default values. Also resets the epoch counter.
   * @param arms An array of BanditArmRecord objects representing the arms to reset.
   * @returns A new array of BanditArmRecord objects with the updated alpha, beta, trialsCount, successCount, failureCount, and totalReward values.
   */
  public resetArms(arms: readonly BanditArmRecord[]): BanditArmRecord[] {
    this.currentEpoch = 0; // Reset epoch counter when arms are reset

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

  /**
   * Advances the epoch counter by a specified number of epochs.
   * @param epochsToAdvance The number of epochs to advance the counter by (default is 1).
   * @returns The updated epoch value.
   */
  public stepEpoch(epochsToAdvance = 1): number {
    this.currentEpoch += epochsToAdvance;
    return this.currentEpoch;
  }

  /**
   * Gets the current epoch value.
   * @returns The current epoch value.
   */
  public getEpoch(): number {
    return this.currentEpoch;
  }

  /**
   * Calculates the mean win rate for a given arm based on its alpha and beta parameters.
   * @param arm The BanditArmRecord object representing the arm.
   * @returns The calculated mean win rate as a number between 0 and 1. Returns 0.5 if denominator is zero to avoid division by zero.
   */
  public calculateMeanWinRate(arm: BanditArmRecord): number {
    const denom = arm.alpha + arm.beta;
    return denom > 0 ? arm.alpha / denom : 0.5; // Return 0.5 if denominator is zero to avoid division by zero
  }

  /**
   * Samples from a Beta distribution using the given alpha and beta parameters.
   * @param alpha The alpha parameter of the Beta distribution.
   * @param beta The beta parameter of the Beta distribution.
   * @returns A random sample from the Beta distribution as a number between 0 and 1.
   */
  private sampleBeta(alpha: number, beta: number): number {
    const u1 = Math.random();
    const u2 = Math.random();

    // Use inverse transform sampling to generate a random variable from the Beta distribution.
    const x = Math.pow(-Math.log(u1 || 0.0001), 1 / Math.max(0.01, alpha)); // Avoid log(0) by adding a small value
    const y = Math.pow(-Math.log(u2 || 0.0001), 1 / Math.max(0.01, beta)); // Avoid log(0) by adding a small value

    return x / (x + y);
  }
}
