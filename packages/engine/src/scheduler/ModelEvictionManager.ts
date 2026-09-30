import type { ModelHealthRepository } from "@cacophony/db";
import type { AgentRole } from "@cacophony/shared-types";
import type { ModelTenancyGuard } from "./ModelTenancyGuard.js";
import type { OllamaModelManager } from "../inference/OllamaModelManager.js";

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
 * tenancy protection checking, and weighted random roulette routing based on empirical historical success rates.
 */
export class ModelEvictionManager {
  private readonly healthRepo: ModelHealthRepository;
  private readonly evictionThreshold: number;
  private readonly explorationRate: number;
  private tenancyGuard: ModelTenancyGuard | undefined;
  private modelManager: OllamaModelManager | undefined;

  constructor(
    healthRepo: ModelHealthRepository,
    evictionThreshold = 3,
    explorationRate = 0.25,
    tenancyGuard?: ModelTenancyGuard,
    modelManager?: OllamaModelManager
  ) {
    this.healthRepo = healthRepo;
    this.evictionThreshold = evictionThreshold;
    this.explorationRate = explorationRate;
    this.tenancyGuard = tenancyGuard;
    this.modelManager = modelManager;
  }

  public setTenancyGuard(guard: ModelTenancyGuard): void {
    this.tenancyGuard = guard;
  }

  public setModelManager(manager: OllamaModelManager): void {
    this.modelManager = manager;
  }

  public getEvictionThreshold(): number {
    return this.evictionThreshold;
  }

  public getExplorationRate(): number {
    return this.explorationRate;
  }

  /**
   * Records execution outcome in the health repository and evaluates automated eviction.
   */
  public async recordRunOutcome(
    modelId: string,
    success: boolean,
    durationMs: number,
    tokensPerSec: number = 30.0
  ): Promise<void> {
    await this.healthRepo.recordRun(modelId, "ollama", success, durationMs, tokensPerSec);

    // Evaluate automated eviction if consecutive failures reach threshold
    if (!success) {
      await this.evaluateModelEviction(modelId);
    }
  }

  /**
   * Evaluates if a model should be evicted, verifying tenancy rules and calling OllamaModelManager.
   */
  public async evaluateModelEviction(modelId: string): Promise<{ evicted: boolean; reason?: string }> {
    const profile = await this.healthRepo.getProfile(modelId);
    if (profile.consecutiveFailures < this.evictionThreshold) {
      return { evicted: false };
    }

    if (this.tenancyGuard) {
      const check = this.tenancyGuard.canEvict(modelId);
      if (!check.allowed) {
        return {
          evicted: false,
          ...(check.reason ? { reason: check.reason } : {})
        };
      }
    }

    // Update status in DB
    await this.healthRepo.updateStatus(modelId, "EJECTED");

    // If model manager is attached, delete the model from local Ollama storage
    if (this.modelManager) {
      try {
        await this.modelManager.deleteModel(modelId);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { evicted: true, reason: `Marked EJECTED but deletion failed: ${errorMsg}` };
      }
    }

    return { evicted: true };
  }

  /**
   * Selects the most optimal model for a role among candidates.
   *
   * 1. Prioritizes the currently loaded model (Affinity) while allowing controlled
   *    exploration so diverse models gather empirical statistics in the arena.
   * 2. Excludes any models that have been EJECTED (consecutive failures >= threshold).
   * 3. Selects among remaining candidates using empirical weighted Bayesian roulette.
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

    // 1. Model Affinity & Fleet Exploration
    // If candidates have 0 runs, or with 25% exploration probability, explore alternate models
    // to build empirical statistics across all models on the leaderboard.
    const underSampled = profiles.filter((p) => p.status !== "EJECTED" && p.totalTasks === 0 && p.modelId !== currentlyLoadedModel);
    const shouldExplore = this.explorationRate > 0 && (underSampled.length > 0 || Math.random() < this.explorationRate);

    if (currentlyLoadedModel && !shouldExplore) {
      const activeMatch = profiles.find(
        (p) => p.modelId === currentlyLoadedModel && p.status === "ACTIVE"
      );
      if (activeMatch) {
        return activeMatch.modelId;
      }
    }

    // 2. Filter Runnable Models: any model that is not EJECTED is eligible for dispatch.
    // ACTIVE models with consecutive failures below the eviction threshold are still ACTIVE
    // in the DB -- the DEGRADED label is only a display-time annotation in the leaderboard.
    // Only genuinely EJECTED models (consecutiveFailures >= evictionThreshold) are excluded.
    let activeCandidates = profiles.filter((p) => p.status !== "EJECTED");

    // Deadlock Prevention: If every candidate has been evicted, revive the one with lowest
    // consecutive failures so the queue doesn't stall permanently.
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
