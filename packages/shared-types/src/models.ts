import { z } from "zod";
import type { ModelLifecycleRole } from "./model.js";

export * from "./model.js";

/**
 * Lifecycle status of candidate models staged in the Bullpen.
 */
export const BullpenCandidateStatusSchema = z.enum([
  "STAGED",
  "PROFILING",
  "EVALUATED",
  "PROMOTED",
  "DEMOTED",
  "REJECTED",
]);
export type BullpenCandidateStatus = z.infer<typeof BullpenCandidateStatusSchema>;

/**
 * Empirical telemetry sample collected during candidate model evaluation.
 */
export interface BullpenEvaluationTelemetry {
  readonly modelId: string;
  readonly epochId?: number | undefined;
  readonly tokensPerSec: number;
  readonly latencyMs: number;
  readonly vramUsedBytes: number;
  readonly success: boolean;
  readonly isTimeout: boolean;
  readonly taskType?: string | undefined;
  readonly evaluatedAt?: string | undefined;
}

/**
 * Comprehensive profile of a candidate model undergoing Bullpen profiling.
 */
export interface BullpenCandidateProfile {
  readonly modelId: string;
  readonly status: BullpenCandidateStatus;
  readonly queuedAt: string;
  readonly targetRoles: readonly ModelLifecycleRole[];
  readonly totalEvaluations: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly timeoutCount: number;
  readonly avgTokensPerSec: number;
  readonly avgLatencyMs: number;
  readonly peakVramBytes: number;
  readonly passRate: number; // 0.0 to 1.0
  readonly baselineModelId?: string | null | undefined;
  readonly promotionRecommended: boolean;
  readonly recommendationReason?: string | null | undefined;
}

/**
 * Structured verdict resulting from comparative evaluation of a Bullpen candidate.
 */
export interface PromotionEvaluationResult {
  readonly candidateModelId: string;
  readonly baselineModelId?: string | null | undefined;
  readonly eligibleForPromotion: boolean;
  readonly recommendation: "PROMOTE" | "HOLD" | "EJECT";
  readonly reason: string;
  readonly metrics: {
    readonly candidatePassRate: number;
    readonly baselinePassRate?: number | undefined;
    readonly candidateTokensPerSec: number;
    readonly baselineTokensPerSec?: number | undefined;
    readonly candidateLatencyMs: number;
    readonly baselineLatencyMs?: number | undefined;
    readonly evalCount: number;
    readonly timeoutCount: number;
  };
}

/**
 * Configuration options for automated Bullpen evaluation and promotion.
 */
export interface ModelBullpenConfig {
  readonly minEvaluationTasks?: number | undefined;
  readonly minPassRate?: number | undefined;
  readonly maxTimeoutRate?: number | undefined;
  readonly maxVramBytes?: number | undefined;
}
