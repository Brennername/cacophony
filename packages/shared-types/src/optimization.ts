import { z } from "zod";

/**
 * Canonical historical arena dataset specification version.
 * Incremented upon breaking schema changes to dataset directory format.
 */
export const CURRENT_ARENA_DATASET_VERSION = "2.0.0";
export const LEGACY_ARENA_DATASET_VERSION = "1.0.0";

/**
 * Dataset directory manifest describing version and compatibility.
 */
export interface ArenaDatasetManifest {
  readonly version: string;
  readonly schemaRevision: number;
  readonly totalTasks: number;
  readonly createdAt: string;
  readonly description?: string;
}

export const ArenaDatasetManifestSchema = z.object({
  version: z.string(),
  schemaRevision: z.number(),
  totalTasks: z.number(),
  createdAt: z.string(),
  description: z.string().optional(),
});

/**
 * Historical summary record from stats.json.
 */
export interface HistoricalArenaStats {
  readonly totalCompleted: number;
  readonly totalFailed: number;
  readonly totalProcessed: number;
  readonly failureReasons: Readonly<Record<string, number>>;
  readonly lastUpdated: string;
  readonly formatVersion?: string;
}

export const HistoricalArenaStatsSchema = z.object({
  totalCompleted: z.number(),
  totalFailed: z.number(),
  totalProcessed: z.number(),
  failureReasons: z.record(z.number()),
  lastUpdated: z.string(),
  formatVersion: z.string().optional(),
});

/**
 * Individual historical task record.
 */
export interface HistoricalTaskRecord {
  readonly id: string;
  readonly taskType?: string;
  readonly model: string;
  readonly status: "completed" | "failed" | "exhausted";
  readonly targetBranch?: string;
  readonly sourceTaskId?: string;
  readonly prompt?: string;
  readonly testCommand?: string;
  readonly focusFiles?: string;
  readonly finishedAt?: string;
  readonly failureReason?: string;
  readonly patchContent?: string;
}

export const HistoricalTaskRecordSchema = z.object({
  id: z.string(),
  taskType: z.string().optional(),
  model: z.string(),
  status: z.enum(["completed", "failed", "exhausted"]),
  targetBranch: z.string().optional(),
  sourceTaskId: z.string().optional(),
  prompt: z.string().optional(),
  testCommand: z.string().optional(),
  focusFiles: z.string().optional(),
  finishedAt: z.string().optional(),
  failureReason: z.string().optional(),
  patchContent: z.string().optional(),
});

/**
 * Historical failure postmortem.
 */
export interface HistoricalPostmortemRecord {
  readonly taskId: string;
  readonly generatedAt: string;
  readonly failureStatus: string;
  readonly failureClass?: string;
  readonly model: string;
  readonly ctxTier?: string;
  readonly errorSnippets?: string;
}

export const HistoricalPostmortemRecordSchema = z.object({
  taskId: z.string(),
  generatedAt: z.string(),
  failureStatus: z.string(),
  failureClass: z.string().optional(),
  model: z.string(),
  ctxTier: z.string().optional(),
  errorSnippets: z.string().optional(),
});

/**
 * Counterfactual pass rate calculation comparing rigid verifiers vs soft/repair policies.
 */
export interface MitigationParadoxReport {
  readonly totalProcessed: number;
  readonly totalCompleted: number;
  readonly totalFailed: number;
  readonly rawPassRatePct: number;
  readonly realTestFailureCount: number;
  readonly realTestFailurePct: number;
  readonly verifierRejectionCount: number;
  readonly verifierRejectionPct: number;
  readonly reviewFailedCount: number;
  readonly noChangesCount: number;
  readonly counterfactualPassRatePct: number;
  readonly estimatedRecoverableTasks: number;
}

export const MitigationParadoxReportSchema = z.object({
  totalProcessed: z.number(),
  totalCompleted: z.number(),
  totalFailed: z.number(),
  rawPassRatePct: z.number(),
  realTestFailureCount: z.number(),
  realTestFailurePct: z.number(),
  verifierRejectionCount: z.number(),
  verifierRejectionPct: z.number(),
  reviewFailedCount: z.number(),
  noChangesCount: z.number(),
  counterfactualPassRatePct: z.number(),
  estimatedRecoverableTasks: z.number(),
});

/**
 * Search Space and Optimization Hyperparameters.
 */
export interface PipelineHyperparameterGenome {
  readonly pipelineId: string;
  readonly ruleEnablement: Readonly<Record<string, boolean>>;
  readonly ruleSeverities: Readonly<Record<string, "silent_repair" | "soft_warning" | "hard_rejection" | "disabled">>;
  readonly ruleOrdering: readonly string[];
  readonly fitnessScore?: number;
}

export interface OptimizationRunResult {
  readonly targetModel: string;
  readonly strategy: "random_search" | "genetic_evolution" | "bayesian";
  readonly generationsEvaluated: number;
  readonly candidatesTested: number;
  readonly baselinePassRatePct: number;
  readonly optimizedPassRatePct: number;
  readonly bestGenome: PipelineHyperparameterGenome;
  readonly executionDurationMs: number;
}
