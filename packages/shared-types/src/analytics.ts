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
