import * as fs from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

export const GrepSearchParamsSchema = z.object({
  path: z.string().default(".")
    .describe("Directory or file path to search."),
  pattern: z.string().min(1)
    .describe("Search query string or regex pattern."),
  isRegex: z.boolean().optional().default(false)
    .describe("Whether pattern should be evaluated as a regular expression."),
  caseInsensitive: z.boolean().optional().default(false)
    .describe("Whether search should be case-insensitive."),
  includes: z.array(z.string()).optional()
    .describe("Glob extensions or file patterns to filter (e.g. ['.ts', '.json']).")
});

export type GrepSearchParams = z.infer<typeof GrepSearchParamsSchema>;

interface GrepMatch {
  readonly file: string;
  readonly lineNumber: number;
  readonly lineContent: string;
}

const MAX_TOTAL_MATCHES = 100;

/**
 * Tool for searching files within the workspace for text or regex patterns,
 * reporting matching files, line numbers, and line contents.
 */
export class GrepSearchTool implements ICacophonyTool<GrepSearchParams> {
  public readonly definition: ToolDefinition = {
    name: "grep_search",
    description: "Search for text or regular expression patterns across files within the workspace.",
    parameterSchema: GrepSearchParamsSchema
  };

  public readonly schema = GrepSearchParamsSchema;

  public async execute(params: GrepSearchParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetPath = resolveSafePath(context.workspaceRoot, params.path);
      const flags = params.caseInsensitive ? "gi" : "g";
      const regex = params.isRegex
        ? new RegExp(params.pattern, flags)
        : new RegExp(params.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);

      const matches: GrepMatch[] = [];
      await this.searchRecursive(targetPath, context.workspaceRoot, regex, params.includes, matches);

      if (matches.length === 0) {
        return {
          success: true,
          output: `No matches found for pattern "${params.pattern}" in "${params.path}".`,
          durationMs: Date.now() - startTime
        };
      }

      const formatted = matches
        .map((m) => `${m.file}:${m.lineNumber}: ${m.lineContent.trim()}`)
        .join("\n");

      let summary = `Found ${matches.length} matches for "${params.pattern}":\n\n${formatted}`;
      if (matches.length >= MAX_TOTAL_MATCHES) {
        summary += `\n\n[Warning: Results capped at ${MAX_TOTAL_MATCHES} matches.]`;
      }

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

  private async searchRecursive(
    currentPath: string,
    workspaceRoot: string,
    regex: RegExp,
    includes: string[] | undefined,
    results: GrepMatch[]
  ): Promise<void> {
    if (results.length >= MAX_TOTAL_MATCHES) return;

    let stat;
    try {
      stat = await fs.stat(currentPath);
    } catch {
      return;
    }

    if (stat.isDirectory()) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= MAX_TOTAL_MATCHES) break;
        if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") {
          continue;
        }
        await this.searchRecursive(
          path.join(currentPath, entry.name),
          workspaceRoot,
          regex,
          includes,
          results
        );
      }
    } else if (stat.isFile()) {
      const ext = path.extname(currentPath);
      if (includes && includes.length > 0) {
        const matchesFilter = includes.some((filter) =>
          filter.startsWith(".") ? ext === filter : currentPath.includes(filter)
        );
        if (!matchesFilter) return;
      }

      try {
        const content = await fs.readFile(currentPath, "utf-8");
        const lines = content.split("\n");
        const relPath = path.relative(workspaceRoot, currentPath);

        for (let i = 0; i < lines.length; i++) {
          if (results.length >= MAX_TOTAL_MATCHES) break;
          const line = lines[i];
          if (!line) continue;
          regex.lastIndex = 0;
          if (regex.test(line)) {
            results.push({
              file: relPath,
              lineNumber: i + 1,
              lineContent: line
            });
          }
        }
      } catch {
        // Skip binary or unreadable files
      }
    }
  }
}
