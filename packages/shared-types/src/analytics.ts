import { z } from "zod";
import type { AgentRole } from "./task.js";

/**
 * Filter criteria for restricting task history evaluations.
 */
export interface IWindowQualificationFilter {
  readonly role?: AgentRole | undefined;
  readonly model?: string | undefined;
  readonly category?: string | undefined;
  readonly commitHash?: string | undefined;
  readonly startDate?: string | undefined;
  readonly endDate?: string | undefined;
}

export const WindowQualificationFilterSchema = z.object({
  role: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  commitHash: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * Configuration options for evaluating dynamic rolling task windows.
 */
export interface IRollingWindowConfig {
  readonly windowSize: number;
  readonly minSampleSize?: number | undefined;
  readonly filter?: IWindowQualificationFilter | undefined;
}

export const RollingWindowConfigSchema = z.object({
  windowSize: z.number().int().positive(),
  minSampleSize: z.number().int().positive().optional(),
  filter: WindowQualificationFilterSchema.optional(),
});

/**
 * Aggregate metrics produced by RollingWindowAnalyticsService.
 */
export interface IRollingWindowMetrics {
  readonly windowSize: number;
  readonly sampleCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly successRatePercent: number;
  readonly velocityDelta: number; // 1st discrete derivative (rate of change)
  readonly accelerationDelta: number; // 2nd discrete derivative (acceleration/deceleration)
  readonly isPlateaued: boolean;
  readonly oldestTaskTimestamp?: string | undefined;
  readonly newestTaskTimestamp?: string | undefined;
  readonly filteredBy: IWindowQualificationFilter;
}

export const RollingWindowMetricsSchema = z.object({
  windowSize: z.number(),
  sampleCount: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  successRatePercent: z.number(),
  velocityDelta: z.number(),
  accelerationDelta: z.number(),
  isPlateaued: z.boolean(),
  oldestTaskTimestamp: z.string().optional(),
  newestTaskTimestamp: z.string().optional(),
  filteredBy: WindowQualificationFilterSchema,
});

export const CommitImpactVerdictSchema = z.enum([
  "IMPROVEMENT",
  "DEGRADATION",
  "NEUTRAL",
  "STRICTER_GUARDRAIL",
  "NOISY_WASTE"
]);
export type CommitImpactVerdict = z.infer<typeof CommitImpactVerdictSchema>;

export interface ICommitImpactReport {
  readonly commitHash: string;
  readonly author: string;
  readonly timestamp: number;
  readonly subject: string;
  readonly filesChanged: readonly string[];
  readonly tasksAttempted: number;
  readonly tasksPassed: number;
  readonly tasksFailed: number;
  readonly passRatePercent: number;
  readonly deltaVsPriorCommit: number;
  readonly totalTokensConsumed: number;
  readonly tokenEfficiency: number;
  readonly verdict: CommitImpactVerdict;
  readonly rationale: string;
}

export const CommitImpactReportSchema = z.object({
  commitHash: z.string(),
  author: z.string(),
  timestamp: z.number(),
  subject: z.string(),
  filesChanged: z.array(z.string()),
  tasksAttempted: z.number(),
  tasksPassed: z.number(),
  tasksFailed: z.number(),
  passRatePercent: z.number(),
  deltaVsPriorCommit: z.number(),
  totalTokensConsumed: z.number(),
  tokenEfficiency: z.number(),
  verdict: CommitImpactVerdictSchema,
  rationale: z.string()
});
