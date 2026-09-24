import { z } from "zod";

/**
 * Multi-Armed Bandit Exploration Policy types.
 */
export type BanditPolicyType = "epsilon_greedy" | "ucb1" | "thompson_sampling";

export const BanditPolicyTypeSchema = z.enum([
  "epsilon_greedy",
  "ucb1",
  "thompson_sampling",
]);

/**
 * Dynamic Bandit Arm State representing a model or configuration permutation.
 */
export interface BanditArmRecord {
  readonly armId: string;
  readonly modelId: string;
  readonly role: string;
  readonly trialsCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalReward: number;
  readonly alpha: number; // Beta prior for Thompson Sampling
  readonly beta: number;  // Beta prior for Thompson Sampling
  readonly averageTokensPerSec: number;
  readonly averageVramMb: number;
  readonly lastSelectedAt?: string;
}

export const BanditArmRecordSchema = z.object({
  armId: z.string(),
  modelId: z.string(),
  role: z.string(),
  trialsCount: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  totalReward: z.number(),
  alpha: z.number(),
  beta: z.number(),
  averageTokensPerSec: z.number(),
  averageVramMb: z.number(),
  lastSelectedAt: z.string().optional(),
});

/**
 * Task Bandit Dispatch Outcome.
 */
export interface BanditDispatchOutcome {
  readonly selectedModel: string;
  readonly policy: BanditPolicyType;
  readonly isExploratory: boolean;
  readonly explorationRationale: string;
  readonly armId: string;
  readonly confidenceScore: number;
}

export const BanditDispatchOutcomeSchema = z.object({
  selectedModel: z.string(),
  policy: BanditPolicyTypeSchema,
  isExploratory: z.boolean(),
  explorationRationale: z.string(),
  armId: z.string(),
  confidenceScore: z.number(),
});

/**
 * Empirical task reward feedback envelope.
 */
export interface EmpiricalRewardFeedback {
  readonly taskId: string;
  readonly armId: string;
  readonly reward: number; // Range [-1.0, 1.0]
  readonly executionOutcome:
    | "clean_first_pass"
    | "repaired_pass"
    | "test_assertion_failed"
    | "rule_rejected"
    | "syntax_compiler_error"
    | "driver_gpu_crash";
  readonly durationMs: number;
  readonly tokensPerSec: number;
  readonly vramMb: number;
}

export const EmpiricalRewardFeedbackSchema = z.object({
  taskId: z.string(),
  armId: z.string(),
  reward: z.number().min(-1.0).max(1.0),
  executionOutcome: z.enum([
    "clean_first_pass",
    "repaired_pass",
    "test_assertion_failed",
    "rule_rejected",
    "syntax_compiler_error",
    "driver_gpu_crash",
  ]),
  durationMs: z.number(),
  tokensPerSec: z.number(),
  vramMb: z.number(),
});

/**
 * Statistical Role Promotion record.
 */
export interface ModelPromotionRecord {
  readonly id: string;
  readonly role: string;
  readonly previousModel: string;
  readonly promotedModel: string;
  readonly winRateDeltaPct: number;
  readonly pValue: number;
  readonly sampleSize: number;
  readonly promotedAt: string;
  readonly rationale: string;
}

export const ModelPromotionRecordSchema = z.object({
  id: z.string(),
  role: z.string(),
  previousModel: z.string(),
  promotedModel: z.string(),
  winRateDeltaPct: z.number(),
  pValue: z.number(),
  sampleSize: z.number(),
  promotedAt: z.string(),
  rationale: z.string(),
});
