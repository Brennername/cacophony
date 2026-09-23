import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";

/**
 * Contextual execution environment provided to tools during runtime invocation.
 */
export interface ToolExecutionContext {
  readonly workspaceRoot: string;
  readonly taskId?: string;
  readonly allowDestructiveCommands?: boolean;
}

/**
 * Generic contract implemented by all Cacophony tools.
 * Enforces SOLID single responsibility, parameter validation via Zod,
 * and deterministic output formatting.
 */
export interface ICacophonyTool<TParams = unknown> {
  readonly definition: ToolDefinition;
  readonly schema: z.ZodType<TParams, z.ZodTypeDef, any>;
  execute(params: TParams, context: ToolExecutionContext): Promise<ToolResult>;
}
