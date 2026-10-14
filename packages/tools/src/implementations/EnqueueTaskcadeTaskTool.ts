import { z } from "zod";
import {
  AgentRoleSchema,
  TaskPrioritySchema,
  TaskMetadataHintsSchema,
  type ToolResult,
  type ToolDefinition,
  type TaskRecord,
} from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";

export const EnqueueTaskcadeTaskParamsSchema = z.object({
  title: z.string().describe("Descriptive summary of the task objective"),
  prompt: z.string().describe("Comprehensive instructions and requirements for the task"),
  role: AgentRoleSchema.optional().default("implementer").describe("Assigned agent role"),
  priority: TaskPrioritySchema.optional().default("P1").describe("Execution priority (P0, P1, P2)"),
  modelAssigned: z.string().optional().describe("Optional pre-assigned model identifier"),
  testCommand: z.string().optional().describe("Unit or integration test command to verify task completion"),
  focusFiles: z.string().optional().describe("Target files or globs relevant to the task"),
  metadataHints: TaskMetadataHintsSchema.optional().describe("Granular execution hints including modelAffinity, temperature, maxTokens, ruleBypassFlags, and stack"),
});

export type EnqueueTaskcadeTaskInput = z.input<typeof EnqueueTaskcadeTaskParamsSchema>;
export type EnqueueTaskcadeTaskParams = z.output<typeof EnqueueTaskcadeTaskParamsSchema>;

/**
 * EnqueueTaskcadeTaskTool
 *
 * Allows agents, supervisors, and external tooling to enqueue tasks into the Cacophony
 * execution queue with granular metadata specifiers, including model affinities,
 * temperature overrides, token budgets, and scrubber rule bypass flags.
 */
export class EnqueueTaskcadeTaskTool implements ICacophonyTool<EnqueueTaskcadeTaskInput> {
  public readonly definition: ToolDefinition = {
    name: "enqueue_taskcade_task",
    description: "Enqueues an autonomous engineering task into the Cacophony queue with optional granular metadata hints.",
    parameterSchema: EnqueueTaskcadeTaskParamsSchema,
  };

  public readonly schema = EnqueueTaskcadeTaskParamsSchema;

  public async execute(
    rawParams: EnqueueTaskcadeTaskInput,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const parsed = EnqueueTaskcadeTaskParamsSchema.safeParse(rawParams);
      if (!parsed.success) {
        return {
          success: false,
          output: "",
          error: `Invalid parameters: ${parsed.error.message}`,
          durationMs: Date.now() - startTime,
        };
      }
      const params = parsed.data;

      // Check if direct task repository is provided in context for in-process execution
      const directRepo = (context as any).taskRepository;
      if (directRepo && typeof directRepo.create === "function") {
        const id = `task-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString();
        const record: TaskRecord = {
          id,
          title: params.title,
          prompt: params.prompt,
          role: params.role,
          status: "PENDING",
          priority: params.priority,
          modelAssigned: params.modelAssigned ?? null,
          testCommand: params.testCommand ?? null,
          focusFiles: params.focusFiles ?? null,
          targetBranch: null,
          prUrl: null,
          failureCount: 0,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          metadataHints: params.metadataHints ?? null,
        };
        const created = await directRepo.create(record);
        return {
          success: true,
          output: JSON.stringify(created, null, 2),
          durationMs: Date.now() - startTime,
        };
      }

      // Fall back to HTTP REST API ingestion
      const apiUrl = (context as any).apiUrl || process.env["CACOPHONY_API_URL"] || "http://127.0.0.1:19634";
      const response = await fetch(`${apiUrl}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env["CACOPHONY_API_TOKEN"]
            ? { Authorization: `Bearer ${process.env["CACOPHONY_API_TOKEN"]}` }
            : {}),
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          output: "",
          error: `Failed to enqueue task via HTTP API (${response.status}): ${errorText}`,
          durationMs: Date.now() - startTime,
        };
      }

      const responseData = await response.json();
      return {
        success: true,
        output: JSON.stringify(responseData, null, 2),
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        output: "",
        error: `Exception enqueuing task: ${message}`,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
