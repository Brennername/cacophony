import { z } from "zod";

/**
 * Valid execution states for an arena task lifecycle.
 */
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

/**
 * Priority tiers for queue ordering and dispatch scheduling.
 */
export const TaskPrioritySchema = z.enum(["P0", "P1", "P2"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

/**
 * Specialized roles fulfilling discrete phases of task execution.
 */
export const AgentRoleSchema = z.enum([
  "implementer",
  "reviewer",
  "architect",
  "planner",
  "test_engineer",
  "doc_writer",
  "type_specialist",
  "security_auditor"
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

/**
 * Granular stages tracked within a single task's pipeline execution.
 */
export const StageNameSchema = z.enum([
  "planning",
  "generation",
  "deterministic_scrub",
  "test_execution",
  "pr_review",
  "merge"
]);
export type StageName = z.infer<typeof StageNameSchema>;

export const StageStatusSchema = z.enum(["RUNNING", "SUCCESS", "FAILURE"]);
export type StageStatus = z.infer<typeof StageStatusSchema>;

/**
 * Core task database entity representing an autonomous unit of work.
 */
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
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
}

/**
 * Detailed step execution log and telemetry within an active task run.
 */
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
}

/**
 * Input DTO for enqueuing a new task into the arena.
 */
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

