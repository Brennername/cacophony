import type { ModelHealthRepository } from "@cacophony/db";
import type { AgentRole, ModelStatus } from "@cacophony/shared-types";
import type { ModelTenancyGuard } from "./ModelTenancyGuard.js";
import type { OllamaModelManager } from "../inference/OllamaModelManager.js";
import { ModelRoleSelector } from "./ModelRoleSelector.js";

export interface ModelCandidateWeight {
  readonly modelId: string;
  readonly weight: number;
  readonly passRate: number;
  readonly consecutiveFailures: number;
  readonly status: ModelStatus;
}

export class ModelEvictionManager {
  private readonly healthRepo: ModelHealthRepository;
  private readonly evictionThreshold: number;
  private readonly explorationRate: number;
  private tenancyGuard: ModelTenancyGuard | undefined;
  private modelManager: OllamaModelManager | undefined;
  private cooldownTimer: { [modelId: string]: NodeJS.Timeout } = {};
  private readonly modelRoles: Map<string, AgentRole> = new Map();
  private readonly roleSelector: ModelRoleSelector;

  constructor(
    healthRepo: ModelHealthRepository,
    evictionThreshold = 3,
    explorationRate = 0.25,
    tenancyGuard?: ModelTenancyGuard,
    modelManager?: OllamaModelManager,
    roleSelector?: ModelRoleSelector,
  ) {
    this.healthRepo = healthRepo;
    this.evictionThreshold = evictionThreshold;
    this.explorationRate = explorationRate;
    this.tenancyGuard = tenancyGuard;
    this.modelManager = modelManager;
    this.roleSelector = roleSelector ?? new ModelRoleSelector();
  }

  public setTenancyGuard(guard: ModelTenancyGuard): void {
    this.tenancyGuard = guard;
  }

  public setModelManager(manager: OllamaModelManager): void {
    this.modelManager = manager;
  }

  public getModelManager(): OllamaModelManager | undefined {
    return this.modelManager;
  }

  public getEvictionThreshold(): number {
    return this.evictionThreshold;
  }

  public getExplorationRate(): number {
    return this.explorationRate;
  }

  public getModelRole(modelId: string): AgentRole {
    return this.modelRoles.get(modelId) ?? "implementer";
  }

  public setModelRole(modelId: string, role: AgentRole): void {
    this.modelRoles.set(modelId, role);
  }

  /**
   * Tracks per-model rolling success rate and auto-demotes models below 50% pass rate
   * to shadow review role while promoting reliable models (T69.6.4).
   */
  public async evaluateModelPromotionDemotion(
    modelId: string,
    minTasks = 4,
  ): Promise<{
    role: AgentRole;
    action: "promoted" | "demoted" | "unchanged";
    passRate: number;
  }> {
    const profile = await this.healthRepo.getProfile(modelId);
    if (profile.totalTasks < minTasks) {
      return {
        role: this.getModelRole(modelId),
        action: "unchanged",
        passRate:
          profile.totalTasks > 0
            ? profile.totalSuccess / profile.totalTasks
            : 1.0,
      };
    }

    const passRate = profile.totalSuccess / profile.totalTasks;
    const currentRole = this.getModelRole(modelId);

    if (passRate < 0.5) {
      this.modelRoles.set(modelId, "reviewer");
      return {
        role: "reviewer",
        action: currentRole !== "reviewer" ? "demoted" : "unchanged",
        passRate,
      };
    }

    if (passRate >= 0.75) {
      this.modelRoles.set(modelId, "implementer");
      return {
        role: "implementer",
        action: currentRole !== "implementer" ? "promoted" : "unchanged",
        passRate,
      };
    }

    return {
      role: currentRole,
      action: "unchanged",
      passRate,
    };
  }

  public async recordRunOutcome(
    modelId: string,
    success: boolean,
    durationMs: number,
    tokensPerSec: number = 30.0,
  ): Promise<void> {
    await this.healthRepo.recordRun(
      modelId,
      "ollama",
      success,
      durationMs,
      tokensPerSec,
    );

    await this.evaluateModelPromotionDemotion(modelId);

    if (!success) {
      await this.evaluateModelEviction(modelId);
    }
  }

  public async evaluateModelEviction(
    modelId: string,
  ): Promise<{ evicted: boolean; reason?: string }> {
    const profile = await this.healthRepo.getProfile(modelId);
    if (profile.consecutiveFailures < this.evictionThreshold) {
      return { evicted: false };
    }

    if (this.tenancyGuard) {
      const check = this.tenancyGuard.canEvict(modelId);
      if (!check.allowed) {
        return {
          evicted: false,
          ...(check.reason ? { reason: check.reason } : {}),
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

    if (this.modelManager && this.tenancyGuard?.getConfig().autoEvictionEnabled) {
      try {
        await this.modelManager.deleteModel(modelId);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          evicted: true,
          reason: `Marked EJECTED but deletion failed: ${errorMsg}`,
        };
      }
    }
    const timer = setTimeout(
      () => {
        delete this.cooldownTimer[modelId];
        void this.healthRepo.updateStatus(modelId, "ACTIVE");
      },
      5 * 60 * 1000,
    );

    if (typeof timer.unref === "function") {
      timer.unref();
    }
    this.cooldownTimer[modelId] = timer;

    return { evicted: true };
  }

  /**
   * Cleans up all active cooldown timers to permit immediate clean process exit.
   */
  public dispose(): void {
    for (const modelId of Object.keys(this.cooldownTimer)) {
      clearTimeout(this.cooldownTimer[modelId]);
      delete this.cooldownTimer[modelId];
    }
  }

  public async selectModel(
    role: AgentRole,
    candidateModels: readonly string[],
    currentlyLoadedModel: string | null,
  ): Promise<string> {
    if (candidateModels.length === 0) {
      throw new Error("No candidate models provided for selection.");
    }

    const profiles = await Promise.all(
      candidateModels.map((m) => this.healthRepo.getProfile(m)),
    );

    const underSampled = profiles.filter(
      (p) =>
        p.status !== "EJECTED" &&
        p.totalTasks === 0 &&
        p.modelId !== currentlyLoadedModel,
    );

    // Prioritize evaluating fresh/undersampled models so newly introduced models get immediate evaluation runs
    if (underSampled.length > 0) {
      return underSampled[0]!.modelId;
    }

    const shouldExplore =
      this.explorationRate > 0 && Math.random() < this.explorationRate;

    const preferredModelForRole = this.roleSelector.selectModelForRole(
      role,
      candidateModels,
    );

    if (currentlyLoadedModel && !shouldExplore) {
      const activeMatch = profiles.find(
        (p) => p.modelId === currentlyLoadedModel && p.status === "ACTIVE",
      );
      if (
        activeMatch &&
        (activeMatch.consecutiveFailures ?? 0) === 0 &&
        (!preferredModelForRole || preferredModelForRole === currentlyLoadedModel)
      ) {
        return activeMatch.modelId;
      }
    }

    let activeCandidates = profiles.filter((p) => p.status !== "EJECTED");

    if (activeCandidates.length === 0) {
      for (const p of profiles) {
        await this.healthRepo.updateStatus(p.modelId, "ACTIVE");
      }
      activeCandidates = await Promise.all(
        candidateModels.map((m) => this.healthRepo.getProfile(m)),
      );
    }

    const weights: ModelCandidateWeight[] = activeCandidates.map((p) => {
      const passRate = (p.totalSuccess + 1) / (p.totalTasks + 2);
      let multiplier = 1.0;

      const modelRole = this.getModelRole(p.modelId);
      if (role === "implementer" && modelRole === "reviewer") {
        multiplier = 0.2;
      } else if (role === "reviewer" && modelRole === "reviewer") {
        multiplier = 1.5;
      }

      // Role specialization boost: boost models specifically tailored for this role
      if (
        this.roleSelector.isPreferredForRole(role, p.modelId) &&
        !(role === "implementer" && modelRole === "reviewer")
      ) {
        multiplier *= 2.5;
      }

      // Penalize consecutive failures to prevent failing loops
      if (p.consecutiveFailures > 0) {
        multiplier *= Math.max(0.1, 1 - p.consecutiveFailures * 0.3);
      }

      const weight = Math.max(0.01, passRate * multiplier);
      return {
        modelId: p.modelId,
        weight,
        passRate,
        consecutiveFailures: p.consecutiveFailures,
        status: p.status,
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
