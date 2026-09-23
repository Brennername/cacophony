import { z } from "zod";

/**
 * Metadata definition describing an invokable tool.
 */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameterSchema: z.ZodTypeAny;
}

/**
 * Standard execution result returned by all tools.
 */
export interface ToolResult {
  readonly success: boolean;
  readonly output: string;
  readonly error?: string;
  readonly durationMs: number;
}

/**
 * Tool execution request dispatched by an AI model.
 */
export interface ToolCallRequest {
  readonly toolName: string;
  readonly parameters: Record<string, unknown>;
  readonly taskId?: string;
}

/**
 * Persistent audit log entry tracking every tool invocation.
 */
export interface ToolAuditLogRecord {
  readonly id: number;
  readonly taskId: string | null;
  readonly toolName: string;
  readonly parametersJson: string;
  readonly resultSummary: string;
  readonly executionTimeMs: number;
  readonly createdAt: string;
}
