import { z } from "zod";

/**
 * Supported inference provider engines.
 */
export const InferenceProviderTypeSchema = z.enum([
  "ollama",
  "openai",
  "anthropic",
  "gemini",
  "lmstudio",
  "groq",
  "mistral",
  "custom"
]);
export type InferenceProviderType = z.infer<typeof InferenceProviderTypeSchema>;

/**
 * Eviction and health status of an AI model candidate.
 */
export const ModelStatusSchema = z.enum(["ACTIVE", "EJECTED", "COOLDOWN"]);
export type ModelStatus = z.infer<typeof ModelStatusSchema>;

/**
 * Historical performance and reliability profile for an AI model.
 */
export interface ModelHealthProfile {
  readonly modelId: string;
  readonly provider: InferenceProviderType;
  readonly totalTasks: number;
  readonly totalSuccess: number;
  readonly totalFailures: number;
  readonly consecutiveFailures: number;
  readonly avgLatencyMs: number;
  readonly avgTokensPerSec: number;
  readonly status: ModelStatus;
  readonly lastUsedAt: string | null;
}

/**
 * Arena epoch demarcation record separating continuous bootstrap eras.
 */
export interface ArenaEpochRecord {
  readonly epochId: number;
  readonly name: string;
  readonly reason: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly isActive: boolean;
  readonly taskCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly notes: string | null;
}

/**
 * Unified inference chat message representation.
 */
export interface ChatMessage {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string;
  readonly name?: string;
  readonly toolCallId?: string;
}

/**
 * Normalized payload for dispatching inference to any provider.
 */
export interface InferenceRequest {
  readonly model: string;
  readonly messages: readonly ChatMessage[];
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly stopSequences?: readonly string[];
  readonly stream?: boolean;
  readonly signal?: AbortSignal;
  readonly contextTokens?: number | undefined;
  readonly numCtx?: number | undefined;
}

/**
 * Normalized response payload returned from inference provider.
 */
export interface InferenceResponse {
  readonly content: string;
  readonly model: string;
  readonly tokensPrompt: number;
  readonly tokensCompletion: number;
  readonly totalTokens: number;
  readonly latencyMs: number;
  readonly tokensPerSec: number;
}

/**
 * Whitebox per-model tuning profile with context, token prediction limits, and sampling options.
 */
export interface ModelTuningProfile {
  readonly id: string;
  readonly modelName: string;
  readonly role: string;
  readonly numPredict: number;
  readonly numCtx: number;
  readonly temperature: number;
  readonly topK: number;
  readonly topP: number;
  readonly repeatPenalty: number;
  readonly autoTuned: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Per-model review capabilities including context window, review temperature, and domain affinity scores.
 */
export interface ModelReviewCapability {
  readonly modelId: string;
  readonly contextWindow: number;
  readonly reviewTemperature: number;
  readonly domainAffinities: Readonly<Record<string, number>>;
}

/**
 * Lifecycle tiers for models managed across the arena.
 */
export const ModelLifecycleTierSchema = z.enum(["ROSTER", "BULLPEN", "BOUTIQUE", "RETIRED"]);
export type ModelLifecycleTier = z.infer<typeof ModelLifecycleTierSchema>;

/**
 * Functional roles assigned to models on the active roster.
 */
export const ModelLifecycleRoleSchema = z.enum([
  "implementer",
  "reviewer",
  "architect",
  "reasoning",
  "doc",
  "triage",
]);
export type ModelLifecycleRole = z.infer<typeof ModelLifecycleRoleSchema>;

/**
 * Persistent record of a model's assignment to the active Roster, Bullpen, or Boutique pool.
 */
export interface ModelRosterEntry {
  readonly id: string;
  readonly modelId: string;
  readonly tier: ModelLifecycleTier;
  readonly roles: readonly ModelLifecycleRole[];
  readonly concurrencyLimit: number;
  readonly isActive: boolean;
  readonly isProtected: boolean;
  readonly evalTaskCount: number;
  readonly notes?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Payload for adding, updating, or promoting models within the lifecycle.
 */
export interface UpsertModelRosterInput {
  readonly modelId: string;
  readonly tier?: ModelLifecycleTier;
  readonly roles?: readonly ModelLifecycleRole[];
  readonly concurrencyLimit?: number;
  readonly isActive?: boolean;
  readonly isProtected?: boolean;
  readonly notes?: string | null;
}
