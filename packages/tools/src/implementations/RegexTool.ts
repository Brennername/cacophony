import * as fs from "node:fs/promises";
import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

export const RegexToolParamsSchema = z.object({
  path: z.string()
    .describe("Relative or absolute path to the file to process."),
  pattern: z.string().min(1)
    .describe("Regular expression pattern to find."),
  replacement: z.string().optional()
    .describe("Replacement string if performing a substitution. Can reference capture groups ($1, $2)."),
  flags: z.string().optional()
    .describe("Regex flags (default: 'g')."),
  dryRun: z.boolean().optional()
    .describe("If true, previews matches/replacements without modifying the file.")
});

export type RegexToolParams = z.infer<typeof RegexToolParamsSchema>;

/**
 * Tool for executing regular expression searches or batch sed-style substitutions on a file.
 */
export class RegexTool implements ICacophonyTool<RegexToolParams> {
  public readonly definition: ToolDefinition = {
    name: "regex_tool",
    description: "Perform regex matching or batch substitutions on a target file with capture groups and dry-run preview.",
    parameterSchema: RegexToolParamsSchema
  };

  public readonly schema = RegexToolParamsSchema;

  public async execute(params: RegexToolParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetPath = resolveSafePath(context.workspaceRoot, params.path);
      const originalContent = await fs.readFile(targetPath, "utf-8");

      const flags = params.flags ?? "g";
      const regex = new RegExp(params.pattern, flags);

      if (params.replacement === undefined) {
        // Search / Match Mode
        const matches = [...originalContent.matchAll(regex)];
        if (matches.length === 0) {
          return {
            success: true,
            output: `No matches found for pattern /${params.pattern}/${flags} in ${params.path}.`,
            durationMs: Date.now() - startTime
          };
        }

        const matchSummaries = matches.slice(0, 50).map((m, idx) => {
          return `Match #${idx + 1}: "${m[0]}" at offset ${m.index}`;
        });

        let summary = `Found ${matches.length} matches in ${params.path}:\n\n` + matchSummaries.join("\n");
        if (matches.length > 50) {
          summary += `\n... and ${matches.length - 50} additional matches.`;
        }

        return {
          success: true,
          output: summary,
          durationMs: Date.now() - startTime
        };
      }

      // Substitution Mode
      const matches = [...originalContent.matchAll(regex)];
      if (matches.length === 0) {
        return {
          success: true,
          output: `No matches found. File ${params.path} was unchanged.`,
          durationMs: Date.now() - startTime
        };
      }

      const updatedContent = originalContent.replace(regex, params.replacement);

      if (params.dryRun) {
        return {
          success: true,
          output: `[Dry Run] Pattern matched ${matches.length} time(s). Preview of substitutions would modify ${params.path} without writing.`,
          durationMs: Date.now() - startTime
        };
      }

      await fs.writeFile(targetPath, updatedContent, "utf-8");

      return {
        success: true,
        output: `Successfully performed regex replacement: ${matches.length} occurrence(s) replaced in ${params.path}.`,
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
