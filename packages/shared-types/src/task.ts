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
  disabledScrubbers: z.array(z.string()).optional()
});
export type EnqueueTaskDto = z.infer<typeof EnqueueTaskDtoSchema>;
