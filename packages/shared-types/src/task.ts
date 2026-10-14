import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "PENDING",
  "SCHEDULED",
  "RUNNING",
  "REMEDIATING",
  "TESTING",
  "IN_REVIEW",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(["P0", "P1", "P2"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const AgentRoleSchema = z.enum([
  "implementer",
  "reviewer",
  "architect",
  "planner",
  "test_engineer",
  "doc_writer",
  "type_specialist",
  "security_auditor",
  "chore_runner"
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const StageNameSchema = z.enum([
  "planning",
  "context_assembly",
  "generation",
  "deterministic_scrub",
  "test_execution",
  "remediation",
  "pr_review"
]);
export type StageName = z.infer<typeof StageNameSchema>;

export const StageStatusSchema = z.enum(["RUNNING", "SUCCESS", "FAILURE"]);
export type StageStatus = z.infer<typeof StageStatusSchema>;

export const TaskMetadataHintsSchema = z.object({
  modelAffinity: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  contextBudget: z.number().optional(),
  timeoutMs: z.number().optional(),
  ruleBypassFlags: z.array(z.string()).optional(),
  stack: z.string().optional(),
  executionGuardrails: z.record(z.any()).optional(),
  customDirectives: z.record(z.string()).optional(),
});
export type TaskMetadataHints = z.infer<typeof TaskMetadataHintsSchema>;


export const RehabStatusSchema = z.enum(["NONE", "PENDING_REHAB", "REHABILITATED", "DECOMPOSED"]);
export type RehabStatus = z.infer<typeof RehabStatusSchema>;

export const TaskRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  role: AgentRoleSchema,
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  modelAssigned: z.string().nullable().optional(),
  testCommand: z.string().nullable().optional(),
  focusFiles: z.string().nullable().optional(),
  targetBranch: z.string().nullable().optional(),
  prUrl: z.string().nullable().optional(),
  failureCount: z.number().int().nonnegative().default(0),
  progressPercent: z.number().min(0).max(100).optional(),
  logSnippet: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  durationMs: z.number().optional(),
  tokensPerSec: z.number().optional(),
  currentStage: StageNameSchema.optional(),
  stageState: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]).optional(),
  stageArtifacts: z.record(z.any()).optional(),
  commitHash: z.string().nullable().optional(),
  baseCommitHash: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  parentTaskId: z.string().nullable().optional(),
  rehabStatus: RehabStatusSchema.optional(),
  metadataHints: TaskMetadataHintsSchema.nullable().optional(),
});

export interface TaskRecord {
  readonly id: string;
  readonly title: string;
  readonly prompt: string;
  readonly role: AgentRole;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly modelAssigned: string | null;
  readonly testCommand: string | null;
  readonly focusFiles: string | null;
  readonly targetBranch: string | null;
  readonly prUrl: string | null;
  readonly failureCount: number;
  readonly progressPercent?: number;
  readonly logSnippet?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;

  readonly durationMs?: number;

  readonly tokensPerSec?: number;

  readonly currentStage?: StageName | undefined;

  readonly stageState?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | undefined;

  readonly stageArtifacts?: Record<string, any> | undefined;

  readonly commitHash?: string | null;

  readonly baseCommitHash?: string | null;

  readonly failureReason?: string | null;

  readonly parentTaskId?: string | null;

  readonly rehabStatus?: RehabStatus;

  readonly metadataHints?: TaskMetadataHints | null | undefined;
}

export interface ITaskRehabilitationPlan {
  readonly parentTaskId: string;
  readonly failureReason: string;
  readonly culpritCommitHash?: string | null;
  readonly rationale: string;
  readonly decomposedTasks: readonly EnqueueTaskDto[];
}

export interface TaskStageRecord {
  readonly id: number;
  readonly taskId: string;
  readonly stageName: StageName;
  readonly stageStatus: StageStatus;
  readonly logOutput: string | null;
  readonly tokensSent: number;
  readonly tokensReceived: number;
  readonly durationMs: number;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly reasoningTranscript?: string | null | undefined;
  readonly distilledOpinion?: string | null | undefined;
  readonly thinkingDurationMs?: number | undefined;
}

export const EnqueueTaskDtoSchema = z.object({
  title: z.string().min(1).max(255),
  prompt: z.string().min(1),
  role: AgentRoleSchema.default("implementer"),
  priority: TaskPrioritySchema.default("P1"),
  model: z.string().optional(),
  testCommand: z.string().optional(),
  focusFiles: z.string().optional(),
  allowedImports: z.array(z.string()).optional(),
  allowEmojis: z.boolean().optional(),
  disabledScrubbers: z.array(z.string()).optional(),
  parentTaskId: z.string().optional(),
  metadataHints: TaskMetadataHintsSchema.optional()
});
export type EnqueueTaskDto = z.infer<typeof EnqueueTaskDtoSchema>;

