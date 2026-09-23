import * as fs from "node:fs/promises";
import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

export const ViewFileParamsSchema = z.object({
  path: z.string().describe("Relative or absolute path to the file to inspect."),
  startLine: z.number().int().positive().optional().describe("Starting line number (1-indexed)."),
  endLine: z.number().int().positive().optional().describe("Ending line number (1-indexed, inclusive)."),
  byteOffset: z.number().int().nonnegative().optional().describe("Byte offset into the file when paginating large text files.")
});

export type ViewFileParams = z.infer<typeof ViewFileParamsSchema>;

const MAX_BYTES_PER_VIEW = 64 * 1024; // 64 KB per page
const DEFAULT_MAX_LINES = 800;

/**
 * Tool for viewing the contents of a file with line-slice indexing and byte offset pagination.
 */
export class ViewFileTool implements ICacophonyTool<ViewFileParams> {
  public readonly definition: ToolDefinition = {
    name: "view_file",
    description: "Read the contents of a text file within the workspace with line-slice indexing and byte pagination.",
    parameterSchema: ViewFileParamsSchema
  };

  public readonly schema = ViewFileParamsSchema;

  public async execute(params: ViewFileParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetPath = resolveSafePath(context.workspaceRoot, params.path);
      const stat = await fs.stat(targetPath);

      if (stat.isDirectory()) {
        return {
          success: false,
          output: "",
          error: `Target path "${params.path}" is a directory. Use list_dir instead.`,
          durationMs: Date.now() - startTime
        };
      }

      const fileBuffer = await fs.readFile(targetPath);
      const byteOffset = params.byteOffset ?? 0;
      const slicedBuffer = fileBuffer.subarray(byteOffset, byteOffset + MAX_BYTES_PER_VIEW);
      const isTruncated = byteOffset + MAX_BYTES_PER_VIEW < fileBuffer.length;

      const content = slicedBuffer.toString("utf-8");
      const allLines = content.split("\n");

      let start = params.startLine ?? 1;
      let end = params.endLine ?? Math.min(start + DEFAULT_MAX_LINES - 1, allLines.length);

      if (start > allLines.length) {
        return {
          success: true,
          output: `File has ${allLines.length} lines. Requested startLine ${start} exceeds total lines.`,
          durationMs: Date.now() - startTime
        };
      }

      if (end < start) {
        end = start;
      }

      // Slice 1-indexed lines
      const selectedLines = allLines.slice(start - 1, end);
      const numberedOutput = selectedLines
        .map((line, index) => `${start + index}: ${line}`)
        .join("\n");

      let summary = `File: ${params.path} (Lines ${start}-${Math.min(end, allLines.length)} of ${allLines.length})\n`;
      if (isTruncated) {
        summary += `[Note: Content truncated at 64KB. Pass byteOffset=${byteOffset + MAX_BYTES_PER_VIEW} to view subsequent bytes.]\n`;
      }
      summary += `\n${numberedOutput}`;

      return {
        success: true,
        output: summary,
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
