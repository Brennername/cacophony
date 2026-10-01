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

export class ModelEvictionManager {
  private readonly healthRepo: ModelHealthRepository;
  private readonly evictionThreshold: number;
  private readonly explorationRate: number;
  private tenancyGuard: ModelTenancyGuard | undefined;
  private modelManager: OllamaModelManager | undefined;
  private cooldownTimer: { [modelId: string]: NodeJS.Timeout } = {};

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

  public async recordRunOutcome(
    modelId: string,
    success: boolean,
    durationMs: number,
    tokensPerSec: number = 30.0
  ): Promise<void> {
    await this.healthRepo.recordRun(modelId, "ollama", success, durationMs, tokensPerSec);

    if (!success) {
      await this.evaluateModelEviction(modelId);
    }
  }

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

    if (this.cooldownTimer[modelId]) {
      clearTimeout(this.cooldownTimer[modelId]);
      delete this.cooldownTimer[modelId];
      await this.healthRepo.updateStatus(modelId, "ACTIVE");
      return { evicted: false, reason: "Model is in COOLDOWN state" };
    }

    await this.healthRepo.updateStatus(modelId, "EJECTED");

    if (this.modelManager) {
      try {
        await this.modelManager.deleteModel(modelId);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { evicted: true, reason: `Marked EJECTED but deletion failed: ${errorMsg}` };
      }
    }

    this.cooldownTimer[modelId] = setTimeout(() => {
      delete this.cooldownTimer[modelId];
      void this.healthRepo.updateStatus(modelId, "ACTIVE");
    }, 5 * 60 * 1000);

    return { evicted: true };
  }

  public async selectModel(
    _role: AgentRole,
    candidateModels: readonly string[],
    currentlyLoadedModel: string | null
  ): Promise<string> {
    if (candidateModels.length === 0) {
      throw new Error("No candidate models provided for selection.");
    }

    const profiles = await Promise.all(
      candidateModels.map((m) => this.healthRepo.getProfile(m))
    );

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

    let activeCandidates = profiles.filter((p) => p.status !== "EJECTED");

    if (activeCandidates.length === 0) {
      const sortedByFailures = [...profiles].sort(
        (a, b) => a.consecutiveFailures - b.consecutiveFailures
      );
      let toRevive = sortedByFailures[0]!;
      await this.healthRepo.updateStatus(toRevive.modelId, "ACTIVE");
      toRevive = await this.healthRepo.getProfile(toRevive.modelId);
      activeCandidates = [toRevive];
    }

    const weights: ModelCandidateWeight[] = activeCandidates.map((p) => {

      const passRate = (p.totalSuccess + 1) / (p.totalTasks + 2);

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