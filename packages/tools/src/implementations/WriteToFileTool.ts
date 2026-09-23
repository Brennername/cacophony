import * as fs from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

export const WriteToFileParamsSchema = z.object({
  path: z.string().describe("Relative or absolute path where the file should be created or overwritten."),
  content: z.string().describe("Complete string contents to write into the destination file."),
  overwrite: z.boolean().optional().default(false).describe("Explicit permission flag required to overwrite an existing file.")
});

export type WriteToFileParams = z.infer<typeof WriteToFileParamsSchema>;

/**
 * Tool for safely writing content to a file, creating parent directories on demand.
 * Refuses to overwrite existing files unless explicitly flagged.
 */
export class WriteToFileTool implements ICacophonyTool<WriteToFileParams> {
  public readonly definition: ToolDefinition = {
    name: "write_to_file",
    description: "Create or overwrite a file within the workspace with parent directory auto-creation.",
    parameterSchema: WriteToFileParamsSchema
  };

  public readonly schema = WriteToFileParamsSchema;

  public async execute(params: WriteToFileParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetPath = resolveSafePath(context.workspaceRoot, params.path);
      let exists = false;
      try {
        await fs.access(targetPath);
        exists = true;
      } catch {
        exists = false;
      }

      if (exists && !params.overwrite) {
        return {
          success: false,
          output: "",
          error: `File "${params.path}" already exists. Set overwrite=true to replace its contents.`,
          durationMs: Date.now() - startTime
        };
      }

      // Ensure directory tree exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, params.content, "utf-8");

      return {
        success: true,
        output: `File successfully written to ${params.path} (${params.content.length} characters).`,
        durationMs: Date.now() - startTime
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        output: "",
        error: message,
        durationMs: Date.now() - startTime
      };
    }
  }
}
