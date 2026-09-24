import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { ExecutionGuard } from "../security/ExecutionGuard.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

const execAsync = promisify(exec);

export const RunCommandParamsSchema = z.object({
  command: z.string().min(1).describe("The shell command line string to execute."),
  cwd: z.string().optional().default(".").describe("Working directory relative to workspace root."),
  timeoutMs: z.number().int().positive().optional().default(120000).describe("Maximum execution time in milliseconds (default: 120000ms).")
});

export type RunCommandParams = z.infer<typeof RunCommandParamsSchema>;

/**
 * Tool for executing shell commands with strict security guard enforcement.
 * Blocks dangerous deletions, privilege escalations, and hard git resets.
 */
export class RunCommandTool implements ICacophonyTool<RunCommandParams> {
  private readonly guard: ExecutionGuard;

  constructor(guard?: ExecutionGuard) {
    this.guard = guard ?? new ExecutionGuard();
  }

  public readonly definition: ToolDefinition = {
    name: "run_command",
    description: "Execute a shell command within the workspace under strict ExecutionGuard security policy.",
    parameterSchema: RunCommandParamsSchema
  };

  public readonly schema = RunCommandParamsSchema;

  public async execute(params: RunCommandParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      // 1. Guard check
      if (!context.allowDestructiveCommands) {
        const securityCheck = this.guard.evaluate(params.command);
        if (!securityCheck.isAllowed) {
          return {
            success: false,
            output: "",
            error: securityCheck.reason ?? "Command rejected by ExecutionGuard policy.",
            durationMs: Date.now() - startTime
          };
        }
      }

      // 2. Resolve safe CWD
      const effectiveCwd = resolveSafePath(context.workspaceRoot, params.cwd ?? ".");

      // 3. Execute
      const { stdout, stderr } = await execAsync(params.command, {
        cwd: effectiveCwd,
        timeout: params.timeoutMs ?? 120000,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      const combinedOutput = [
        stdout ? `[stdout]\n${stdout.trim()}` : "",
        stderr ? `[stderr]\n${stderr.trim()}` : ""
      ]
        .filter((chunk) => chunk.length > 0)
        .join("\n\n");

      return {
        success: true,
        output: combinedOutput || "(Command completed with no output)",
        durationMs: Date.now() - startTime
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        output: "",
        error: `Command execution failed: ${message}`,
        durationMs: Date.now() - startTime
      };
    }
  }
}
