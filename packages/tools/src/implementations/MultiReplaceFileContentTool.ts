import * as fs from "node:fs/promises";
import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

export const ReplacementChunkSchema = z.object({
  targetContent: z.string().min(1).describe("The exact character sequence to replace."),
  replacementContent: z.string().describe("The new text to substitute in place of targetContent."),
  startLine: z.number().int().positive().optional().describe("Optional 1-indexed starting line bound for this chunk."),
  endLine: z.number().int().positive().optional().describe("Optional 1-indexed ending line bound for this chunk.")
});

export const MultiReplaceFileContentParamsSchema = z.object({
  path: z.string().describe("Relative or absolute path to the file to modify."),
  replacementChunks: z.array(ReplacementChunkSchema).min(1).describe("Ordered list of non-contiguous replacement chunks to apply atomically.")
});

export type MultiReplaceFileContentParams = z.infer<typeof MultiReplaceFileContentParamsSchema>;

/**
 * Tool for executing multiple non-contiguous edits atomically within a single file.
 * If any chunk fails validation or uniqueness checks, no edits are committed to disk.
 */
export class MultiReplaceFileContentTool implements ICacophonyTool<MultiReplaceFileContentParams> {
  public readonly definition: ToolDefinition = {
    name: "multi_replace_file_content",
    description: "Atomically apply multiple distinct replacements across non-contiguous sections of a file.",
    parameterSchema: MultiReplaceFileContentParamsSchema
  };

  public readonly schema = MultiReplaceFileContentParamsSchema;

  public async execute(params: MultiReplaceFileContentParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetPath = resolveSafePath(context.workspaceRoot, params.path);
      let content = await fs.readFile(targetPath, "utf-8");

      // Validate all chunks against the file buffer sequentially
      let simulatedContent = content;
      const appliedChunks: string[] = [];

      for (let i = 0; i < params.replacementChunks.length; i++) {
        const chunk = params.replacementChunks[i];
        if (!chunk) continue;

        if (chunk.startLine !== undefined || chunk.endLine !== undefined) {
          const lines = simulatedContent.split("\n");
          const start = (chunk.startLine ?? 1) - 1;
          const end = chunk.endLine ?? lines.length;

          if (start < 0 || start >= lines.length) {
            return {
              success: false,
              output: "",
              error: `Chunk #${i + 1} startLine ${chunk.startLine} is out of bounds (total lines: ${lines.length}).`,
              durationMs: Date.now() - startTime
            };
          }

          const preLines = lines.slice(0, start).join("\n");
          const targetRegion = lines.slice(start, end).join("\n");
          const postLines = lines.slice(end).join("\n");

          const occurrences = targetRegion.split(chunk.targetContent).length - 1;
          if (occurrences === 0) {
            return {
              success: false,
              output: "",
              error: `Chunk #${i + 1} targetContent not found between lines ${chunk.startLine ?? 1} and ${end}.`,
              durationMs: Date.now() - startTime
            };
          }
          if (occurrences > 1) {
            return {
              success: false,
              output: "",
              error: `Chunk #${i + 1} targetContent is ambiguous (${occurrences} matches found between lines ${chunk.startLine ?? 1} and ${end}).`,
              durationMs: Date.now() - startTime
            };
          }

          const replacedRegion = targetRegion.replace(chunk.targetContent, chunk.replacementContent);
          simulatedContent = [
            preLines.length > 0 ? preLines : null,
            replacedRegion,
            postLines.length > 0 ? postLines : null
          ]
            .filter((c) => c !== null)
            .join("\n");
        } else {
          const occurrences = simulatedContent.split(chunk.targetContent).length - 1;
          if (occurrences === 0) {
            return {
              success: false,
              output: "",
              error: `Chunk #${i + 1} targetContent not found in file.`,
              durationMs: Date.now() - startTime
            };
          }
          if (occurrences > 1) {
            return {
              success: false,
              output: "",
              error: `Chunk #${i + 1} targetContent is ambiguous (${occurrences} matches found). Narrow with startLine/endLine.`,
              durationMs: Date.now() - startTime
            };
          }

          simulatedContent = simulatedContent.replace(chunk.targetContent, chunk.replacementContent);
        }

        appliedChunks.push(`Chunk #${i + 1}`);
      }

      // If all passed simulation, commit atomically to disk
      await fs.writeFile(targetPath, simulatedContent, "utf-8");

      return {
        success: true,
        output: `Successfully applied ${appliedChunks.length} replacement chunks atomically to ${params.path}.`,
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
