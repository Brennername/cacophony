import type { ModelHealthRepository } from "@cacophony/db";
import type { AgentRole } from "@cacophony/shared-types";

export interface ModelCandidateWeight {
  readonly modelId: string;
  readonly weight: number;
  readonly passRate: number;
  readonly consecutiveFailures: number;
  readonly status: string;
}

/**
 * ModelEvictionManager
 *
 * Enforces dynamic model selection, automated consecutive-failure eviction,
 * and weighted random roulette routing based on empirical historical success rates.
 */
export class ModelEvictionManager {
  private readonly healthRepo: ModelHealthRepository;
  private readonly evictionThreshold: number;

  constructor(healthRepo: ModelHealthRepository, evictionThreshold = 3) {
    this.healthRepo = healthRepo;
    this.evictionThreshold = evictionThreshold;
  }

  public getEvictionThreshold(): number {
    return this.evictionThreshold;
  }

  /**
   * Selects the most optimal model for a role among candidates.
   *
   * 1. Prioritizes the currently loaded model if it is active and among candidate options (Affinity).
   * 2. Excludes any models that have been EJECTED (consecutive failures >= threshold).
   * 3. Selects among remaining candidates using empirical weighted random roulette.
   */
  public async selectModel(
    _role: AgentRole,
    candidateModels: readonly string[],
    currentlyLoadedModel: string | null
  ): Promise<string> {
    if (candidateModels.length === 0) {
      throw new Error("No candidate models provided for selection.");
    }

    // Fetch health profiles for all candidate models
    const profiles = await Promise.all(
      candidateModels.map((m) => this.healthRepo.getProfile(m))
    );

    // 1. Model Affinity Check
    if (currentlyLoadedModel) {
      const activeMatch = profiles.find(
        (p) => p.modelId === currentlyLoadedModel && p.status === "ACTIVE"
      );
      if (activeMatch) {
        return activeMatch.modelId;
      }
    }

    // 2. Filter Active Models
    let activeCandidates = profiles.filter((p) => p.status === "ACTIVE");

    // Deadlock Prevention: If all models are ejected, revive the one with lowest consecutive failures
    if (activeCandidates.length === 0) {
      const sortedByFailures = [...profiles].sort(
        (a, b) => a.consecutiveFailures - b.consecutiveFailures
      );
      let toRevive = sortedByFailures[0]!;
      await this.healthRepo.updateStatus(toRevive.modelId, "ACTIVE");
      toRevive = await this.healthRepo.getProfile(toRevive.modelId);
      activeCandidates = [toRevive];
    }

    // 3. Compute Bayesian Success Weights
    const weights: ModelCandidateWeight[] = activeCandidates.map((p) => {
      // Laplace smoothed empirical pass rate: (success + 1) / (total + 2)
      const passRate = (p.totalSuccess + 1) / (p.totalTasks + 2);
      // Floor weight at 0.05 to maintain exploration probability
      const weight = Math.max(0.05, passRate);
      return {
        modelId: p.modelId,
        weight,
        passRate,
        consecutiveFailures: p.consecutiveFailures,
        status: p.status
      };
    });

    return this.rouletteSelect(weights);
  }

  /**
   * Executes weighted random selection (roulette wheel selection).
   */
  public rouletteSelect(weights: readonly ModelCandidateWeight[]): string {
    const totalWeight = weights.reduce((acc, curr) => acc + curr.weight, 0);
    const randomPoint = Math.random() * totalWeight;

    let currentAcc = 0;
    for (const candidate of weights) {
      currentAcc += candidate.weight;
      if (randomPoint <= currentAcc) {
        return candidate.modelId;
      }
    }

    return weights[0]!.modelId;
  }
}
