import * as fs from "node:fs/promises";
import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

export const ReplaceFileContentParamsSchema = z.object({
  path: z.string().describe("Relative or absolute path to the file to modify."),
  targetContent: z.string().min(1).describe("The exact character-sequence to find and replace."),
  replacementContent: z.string().describe("The replacement string to insert."),
  startLine: z.number().int().positive().optional().describe("Optional 1-indexed starting line bound for search."),
  endLine: z.number().int().positive().optional().describe("Optional 1-indexed ending line bound for search.")
});

export type ReplaceFileContentParams = z.infer<typeof ReplaceFileContentParamsSchema>;

/**
 * Tool for performing single contiguous character-level block replacements in a file.
 * Strictly verifies uniqueness of target content to prevent accidental ambiguity.
 */
export class ReplaceFileContentTool implements ICacophonyTool<ReplaceFileContentParams> {
  public readonly definition: ToolDefinition = {
    name: "replace_file_content",
    description: "Replace an exact contiguous block of code in a file with new content. Fails if target is not unique within line bounds.",
    parameterSchema: ReplaceFileContentParamsSchema
  };

  public readonly schema = ReplaceFileContentParamsSchema;

  public async execute(params: ReplaceFileContentParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetPath = resolveSafePath(context.workspaceRoot, params.path);
      const originalContent = await fs.readFile(targetPath, "utf-8");

      // Check if line range constraints are specified
      if (params.startLine !== undefined || params.endLine !== undefined) {
        const lines = originalContent.split("\n");
        const start = (params.startLine ?? 1) - 1;
        const end = params.endLine ?? lines.length;

        if (start < 0 || start >= lines.length) {
          return {
            success: false,
            output: "",
            error: `Specified startLine ${params.startLine} is out of file bounds (total lines: ${lines.length}).`,
            durationMs: Date.now() - startTime
          };
        }

        const preLines = lines.slice(0, start).join("\n");
        const targetRegion = lines.slice(start, end).join("\n");
        const postLines = lines.slice(end).join("\n");

        const occurrences = targetRegion.split(params.targetContent).length - 1;
        if (occurrences === 0) {
          return {
            success: false,
            output: "",
            error: `Target content not found within specified line bounds ${params.startLine ?? 1} to ${end}.`,
            durationMs: Date.now() - startTime
          };
        }
        if (occurrences > 1) {
          return {
            success: false,
            output: "",
            error: `Target content is not unique within line bounds ${params.startLine ?? 1} to ${end} (${occurrences} matches found). Narrow line range or include surrounding context.`,
            durationMs: Date.now() - startTime
          };
        }

        const replacedRegion = targetRegion.replace(params.targetContent, params.replacementContent);
        const newContent = [
          preLines.length > 0 ? preLines : null,
          replacedRegion,
          postLines.length > 0 ? postLines : null
        ]
          .filter((chunk) => chunk !== null)
          .join("\n");

        await fs.writeFile(targetPath, newContent, "utf-8");
        return {
          success: true,
          output: `Successfully replaced content in ${params.path} within lines ${params.startLine ?? 1}-${end}.`,
          durationMs: Date.now() - startTime
        };
      }

      // Entire file search
      const occurrences = originalContent.split(params.targetContent).length - 1;
      if (occurrences === 0) {
        return {
          success: false,
          output: "",
          error: `Target content not found in ${params.path}.`,
          durationMs: Date.now() - startTime
        };
      }
      if (occurrences > 1) {
        return {
          success: false,
          output: "",
          error: `Target content occurs ${occurrences} times in ${params.path}. Provide startLine/endLine bounds or additional context to uniquely identify it.`,
          durationMs: Date.now() - startTime
        };
      }

      const updatedContent = originalContent.replace(params.targetContent, params.replacementContent);
      await fs.writeFile(targetPath, updatedContent, "utf-8");

      return {
        success: true,
        output: `Successfully replaced content in ${params.path}.`,
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
