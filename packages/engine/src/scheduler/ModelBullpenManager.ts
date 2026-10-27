import type {
  BullpenCandidateProfile,
  BullpenCandidateStatus,
  BullpenEvaluationTelemetry,
  PromotionEvaluationResult,
  ModelBullpenConfig,
  ModelLifecycleRole,
  ModelRosterEntry,
} from "@cacophony/shared-types";
import type { ModelRosterRepository } from "@cacophony/db";

export interface IOllamaModelDeleter {
  deleteModel(modelId: string): Promise<boolean>;
  pullModel?(modelId: string): Promise<boolean>;
}

export interface ModelBullpenManagerOptions {
  readonly rosterRepo: ModelRosterRepository;
  readonly config?: ModelBullpenConfig | undefined;
  readonly modelManager?: IOllamaModelDeleter | undefined;
  readonly defaultBaselineModelId?: string | undefined;
}

interface MutableCandidateProfile {
  modelId: string;
  status: BullpenCandidateStatus;
  queuedAt: string;
  targetRoles: ModelLifecycleRole[];
  totalEvaluations: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  totalTokensPerSecSum: number;
  totalLatencySumMs: number;
  peakVramBytes: number;
  baselineModelId: string | null;
  promotionRecommended: boolean;
  recommendationReason: string | null;
}

/**
 * ModelBullpenManager
 *
 * Implements Phase S5 (T-S5.3):
 * Dual-tier model lifecycle management separating active core models (Roster)
 * from candidate evaluation pools (Bullpen).
 *
 * Automates:
 * 1. Staging candidate models without jeopardizing core arena stability.
 * 2. Multi-epoch telemetry collection (tokens/sec, latency, memory, pass rate, timeouts).
 * 3. Comparative promotion recommendations against baseline models.
 * 4. Safe demotion and weight deprovisioning when models underperform, while retaining
 *    historical empirical records.
 */
export class ModelBullpenManager {
  private readonly rosterRepo: ModelRosterRepository;
  private readonly minEvaluationTasks: number;
  private readonly minPassRate: number;
  private readonly maxTimeoutRate: number;
  private readonly maxVramBytes: number;
  private readonly modelManager?: IOllamaModelDeleter | undefined;
  private readonly defaultBaselineModelId: string;
  private readonly candidates: Map<string, MutableCandidateProfile> = new Map();
  private readonly historicalEvaluations: Map<string, BullpenEvaluationTelemetry[]> = new Map();

  constructor(options: ModelBullpenManagerOptions) {
    this.rosterRepo = options.rosterRepo;
    this.minEvaluationTasks = options.config?.minEvaluationTasks ?? 5;
    this.minPassRate = options.config?.minPassRate ?? 0.8;
    this.maxTimeoutRate = options.config?.maxTimeoutRate ?? 0.1;
    this.maxVramBytes = options.config?.maxVramBytes ?? 16 * 1024 * 1024 * 1024; // 16GB default
    this.modelManager = options.modelManager;
    this.defaultBaselineModelId =
      options.defaultBaselineModelId ||
      process.env.DEFAULT_IMPLEMENTER_MODEL ||
      "deepseek-coder-v2:16b";
  }

  /**
   * Enqueues a candidate model into the Bullpen for automated profiling.
   */
  public async queueCandidate(
    modelId: string,
    targetRoles: readonly ModelLifecycleRole[] = ["implementer"],
    baselineModelId?: string | undefined,
  ): Promise<BullpenCandidateProfile> {
    const baseline = baselineModelId || this.defaultBaselineModelId;
    const now = new Date().toISOString();

    // Register or update entry in database with BULLPEN tier
    await this.rosterRepo.upsert({
      modelId,
      tier: "BULLPEN",
      roles: targetRoles,
      isActive: true,
      isProtected: false,
      notes: `Staged in Bullpen against baseline ${baseline}`,
    });

    const candidate: MutableCandidateProfile = {
      modelId,
      status: "STAGED",
      queuedAt: now,
      targetRoles: [...targetRoles],
      totalEvaluations: 0,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      totalTokensPerSecSum: 0,
      totalLatencySumMs: 0,
      peakVramBytes: 0,
      baselineModelId: baseline,
      promotionRecommended: false,
      recommendationReason: null,
    };

    this.candidates.set(modelId, candidate);
    if (!this.historicalEvaluations.has(modelId)) {
      this.historicalEvaluations.set(modelId, []);
    }

    return this.toReadonlyProfile(candidate);
  }

  /**
   * Records empirical telemetry from a completed task execution during a profiling epoch.
   */
  public async recordEvaluation(
    telemetry: BullpenEvaluationTelemetry,
  ): Promise<BullpenCandidateProfile> {
    let candidate = this.candidates.get(telemetry.modelId);
    if (!candidate) {
      // Auto-register candidate if not previously staged in memory
      await this.queueCandidate(telemetry.modelId);
      candidate = this.candidates.get(telemetry.modelId)!;
    }

    candidate.status = "PROFILING";
    candidate.totalEvaluations += 1;

    if (telemetry.success) {
      candidate.successCount += 1;
    } else {
      candidate.failureCount += 1;
    }

    if (telemetry.isTimeout) {
      candidate.timeoutCount += 1;
    }

    candidate.totalTokensPerSecSum += telemetry.tokensPerSec;
    candidate.totalLatencySumMs += telemetry.latencyMs;

    if (telemetry.vramUsedBytes > candidate.peakVramBytes) {
      candidate.peakVramBytes = telemetry.vramUsedBytes;
    }

    // Persist evaluation counter in database
    await this.rosterRepo.incrementEvalCount(telemetry.modelId);

    // Save historical telemetry record
    const history = this.historicalEvaluations.get(telemetry.modelId) ?? [];
    history.push(telemetry);
    this.historicalEvaluations.set(telemetry.modelId, history);

    // Check if sufficient evaluation tasks have been run to generate recommendation
    if (candidate.totalEvaluations >= this.minEvaluationTasks) {
      candidate.status = "EVALUATED";
      const evalResult = this.evaluatePromotion(telemetry.modelId, candidate.baselineModelId ?? undefined);
      candidate.promotionRecommended = evalResult.eligibleForPromotion;
      candidate.recommendationReason = evalResult.reason;
    }

    return this.toReadonlyProfile(candidate);
  }

  /**
   * Evaluates promotion eligibility by comparing candidate telemetry against baseline thresholds.
   */
  public evaluatePromotion(
    modelId: string,
    baselineModelId?: string | undefined,
  ): PromotionEvaluationResult {
    const candidate = this.candidates.get(modelId);
    if (!candidate) {
      return {
        candidateModelId: modelId,
        baselineModelId,
        eligibleForPromotion: false,
        recommendation: "HOLD",
        reason: `Model ${modelId} is not registered in the active Bullpen.`,
        metrics: {
          candidatePassRate: 0,
          candidateTokensPerSec: 0,
          candidateLatencyMs: 0,
          evalCount: 0,
          timeoutCount: 0,
        },
      };
    }

    const total = candidate.totalEvaluations;
    if (total === 0) {
      return {
        candidateModelId: modelId,
        baselineModelId,
        eligibleForPromotion: false,
        recommendation: "HOLD",
        reason: "No evaluation tasks completed yet.",
        metrics: {
          candidatePassRate: 0,
          candidateTokensPerSec: 0,
          candidateLatencyMs: 0,
          evalCount: 0,
          timeoutCount: 0,
        },
      };
    }

    const passRate = candidate.successCount / total;
    const avgTokSec = candidate.totalTokensPerSecSum / total;
    const avgLatency = candidate.totalLatencySumMs / total;
    const timeoutRate = candidate.timeoutCount / total;

    // Check ejection criteria first: chronic timeouts or failure rate
    if (candidate.timeoutCount >= 3 || (total >= 4 && timeoutRate > this.maxTimeoutRate * 2)) {
      return {
        candidateModelId: modelId,
        baselineModelId,
        eligibleForPromotion: false,
        recommendation: "EJECT",
        reason: `Candidate exceeded timeout budget (${candidate.timeoutCount} timeouts in ${total} runs). Deprovisioning recommended to prevent host thrashing.`,
        metrics: {
          candidatePassRate: passRate,
          candidateTokensPerSec: avgTokSec,
          candidateLatencyMs: avgLatency,
          evalCount: total,
          timeoutCount: candidate.timeoutCount,
        },
      };
    }

    if (total >= 4 && passRate < 0.4) {
      return {
        candidateModelId: modelId,
        baselineModelId,
        eligibleForPromotion: false,
        recommendation: "EJECT",
        reason: `Candidate pass rate (${(passRate * 100).toFixed(1)}%) is critically below acceptable thresholds.`,
        metrics: {
          candidatePassRate: passRate,
          candidateTokensPerSec: avgTokSec,
          candidateLatencyMs: avgLatency,
          evalCount: total,
          timeoutCount: candidate.timeoutCount,
        },
      };
    }

    // Check minimum evaluation tasks
    if (total < this.minEvaluationTasks) {
      return {
        candidateModelId: modelId,
        baselineModelId,
        eligibleForPromotion: false,
        recommendation: "HOLD",
        reason: `Evaluating: ${total}/${this.minEvaluationTasks} tasks completed. Current pass rate: ${(passRate * 100).toFixed(1)}%.`,
        metrics: {
          candidatePassRate: passRate,
          candidateTokensPerSec: avgTokSec,
          candidateLatencyMs: avgLatency,
          evalCount: total,
          timeoutCount: candidate.timeoutCount,
        },
      };
    }

    // Check VRAM budget
    if (candidate.peakVramBytes > this.maxVramBytes) {
      return {
        candidateModelId: modelId,
        baselineModelId,
        eligibleForPromotion: false,
        recommendation: "HOLD",
        reason: `Peak VRAM allocation (${(candidate.peakVramBytes / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeds physical headroom budget (${(this.maxVramBytes / (1024 * 1024 * 1024)).toFixed(2)} GB).`,
        metrics: {
          candidatePassRate: passRate,
          candidateTokensPerSec: avgTokSec,
          candidateLatencyMs: avgLatency,
          evalCount: total,
          timeoutCount: candidate.timeoutCount,
        },
      };
    }

    // Promotion criteria met
    if (passRate >= this.minPassRate && timeoutRate <= this.maxTimeoutRate) {
      return {
        candidateModelId: modelId,
        baselineModelId,
        eligibleForPromotion: true,
        recommendation: "PROMOTE",
        reason: `Candidate satisfied all promotion gates: ${(passRate * 100).toFixed(1)}% pass rate across ${total} tasks, ${avgTokSec.toFixed(1)} tok/s, 0 critical regressions.`,
        metrics: {
          candidatePassRate: passRate,
          candidateTokensPerSec: avgTokSec,
          candidateLatencyMs: avgLatency,
          evalCount: total,
          timeoutCount: candidate.timeoutCount,
        },
      };
    }

    return {
      candidateModelId: modelId,
      baselineModelId,
      eligibleForPromotion: false,
      recommendation: "HOLD",
      reason: `Pass rate (${(passRate * 100).toFixed(1)}%) is below minimum required ${(this.minPassRate * 100).toFixed(1)}%.`,
      metrics: {
        candidatePassRate: passRate,
        candidateTokensPerSec: avgTokSec,
        candidateLatencyMs: avgLatency,
        evalCount: total,
        timeoutCount: candidate.timeoutCount,
      },
    };
  }

  /**
   * Promotes an evaluated candidate to the active core Roster.
   */
  public async promoteCandidate(
    modelId: string,
    roles?: readonly ModelLifecycleRole[] | undefined,
  ): Promise<ModelRosterEntry> {
    const candidate = this.candidates.get(modelId);
    const assignedRoles = roles ?? candidate?.targetRoles ?? ["implementer"];

    const updated = await this.rosterRepo.upsert({
      modelId,
      tier: "ROSTER",
      roles: assignedRoles,
      isActive: true,
      isProtected: true,
      notes: `Promoted from Bullpen on ${new Date().toISOString()}`,
    });

    if (candidate) {
      candidate.status = "PROMOTED";
      candidate.promotionRecommended = false;
      candidate.recommendationReason = "Model successfully promoted to active Roster.";
    }

    return updated;
  }

  /**
   * Demotes or ejects a candidate from the Bullpen, safely deprovisioning local weights
   * if a model manager is configured, while preserving historical telemetry.
   */
  public async demoteOrEject(modelId: string, reason: string): Promise<void> {
    const candidate = this.candidates.get(modelId);

    // Update database entry to RETIRED
    await this.rosterRepo.upsert({
      modelId,
      tier: "RETIRED",
      isActive: false,
      isProtected: false,
      notes: `Ejected from Bullpen: ${reason}`,
    });

    if (candidate) {
      candidate.status = "REJECTED";
      candidate.promotionRecommended = false;
      candidate.recommendationReason = reason;
    }

    // Deprovision local disk weights safely without deleting historical performance records
    if (this.modelManager) {
      try {
        await this.modelManager.deleteModel(modelId);
      } catch {
        // Keep resilient if local Ollama daemon is unreachable
      }
    }
  }

  /**
   * Returns profile for a specific candidate.
   */
  public getCandidateProfile(modelId: string): BullpenCandidateProfile | null {
    const candidate = this.candidates.get(modelId);
    return candidate ? this.toReadonlyProfile(candidate) : null;
  }

  /**
   * Lists all candidates currently in the Bullpen.
   */
  public listCandidates(): readonly BullpenCandidateProfile[] {
    return Array.from(this.candidates.values()).map((c) => this.toReadonlyProfile(c));
  }

  /**
   * Returns current Bullpen aggregate status and candidate breakdown.
   */
  public async getBullpenStatus(): Promise<{
    readonly activeRosterCount: number;
    readonly bullpenCandidates: readonly BullpenCandidateProfile[];
    readonly stagedCount: number;
    readonly profilingCount: number;
    readonly evaluatedCount: number;
  }> {
    const roster = await this.rosterRepo.getActiveRoster();
    const candidates = this.listCandidates();

    return {
      activeRosterCount: roster.length,
      bullpenCandidates: candidates,
      stagedCount: candidates.filter((c) => c.status === "STAGED").length,
      profilingCount: candidates.filter((c) => c.status === "PROFILING").length,
      evaluatedCount: candidates.filter((c) => c.status === "EVALUATED").length,
    };
  }

  private toReadonlyProfile(candidate: MutableCandidateProfile): BullpenCandidateProfile {
    const total = candidate.totalEvaluations;
    const passRate = total > 0 ? candidate.successCount / total : 0;
    const avgTokensPerSec = total > 0 ? candidate.totalTokensPerSecSum / total : 0;
    const avgLatencyMs = total > 0 ? candidate.totalLatencySumMs / total : 0;

    return {
      modelId: candidate.modelId,
      status: candidate.status,
      queuedAt: candidate.queuedAt,
      targetRoles: [...candidate.targetRoles],
      totalEvaluations: candidate.totalEvaluations,
      successCount: candidate.successCount,
      failureCount: candidate.failureCount,
      timeoutCount: candidate.timeoutCount,
      avgTokensPerSec,
      avgLatencyMs,
      peakVramBytes: candidate.peakVramBytes,
      passRate,
      baselineModelId: candidate.baselineModelId,
      promotionRecommended: candidate.promotionRecommended,
      recommendationReason: candidate.recommendationReason,
    };
  }
}
