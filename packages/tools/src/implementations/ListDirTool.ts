import * as fs from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

export const ListDirParamsSchema = z.object({
  path: z.string().default(".").describe("Directory path relative to workspace root."),
  recursive: z.boolean().optional().default(false).describe("Whether to recursively inspect child directories.")
});

export type ListDirParams = z.infer<typeof ListDirParamsSchema>;

interface DirEntryInfo {
  readonly name: string;
  readonly relativePath: string;
  readonly isDirectory: boolean;
  readonly sizeBytes?: number;
  readonly childCount?: number;
}

/**
 * Tool for inspecting directory structures, reporting file sizes, directory flags, and child counts.
 */
export class ListDirTool implements ICacophonyTool<ListDirParams> {
  public readonly definition: ToolDefinition = {
    name: "list_dir",
    description: "List files and subdirectories within a directory path, reporting sizes, types, and recursive child counts.",
    parameterSchema: ListDirParamsSchema
  };

  public readonly schema = ListDirParamsSchema;

  public async execute(params: ListDirParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetPath = resolveSafePath(context.workspaceRoot, params.path);
      const stat = await fs.stat(targetPath);

      if (!stat.isDirectory()) {
        return {
          success: false,
          output: "",
          error: `Target path "${params.path}" is not a directory.`,
          durationMs: Date.now() - startTime
        };
      }

      const entries = await this.readEntries(targetPath, targetPath, params.recursive ?? false, 0);

      const formatted = entries
        .map((e) => {
          if (e.isDirectory) {
            return `[DIR]  ${e.relativePath} (${e.childCount ?? 0} direct entries)`;
          }
          return `[FILE] ${e.relativePath} (${e.sizeBytes ?? 0} bytes)`;
        })
        .join("\n");

      const summary = `Directory listing for "${params.path}": ${entries.length} items found\n\n${formatted}`;

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

  private async readEntries(
    rootDir: string,
    currentDir: string,
    recursive: boolean,
    depth: number
  ): Promise<DirEntryInfo[]> {
    if (depth > 10) return []; // safety limit
    const items = await fs.readdir(currentDir, { withFileTypes: true });
    const results: DirEntryInfo[] = [];

    for (const item of items) {
      // Skip VCS and package caches
      if (item.name === ".git" || item.name === "node_modules" || item.name === "dist") {
        continue;
      }

      const fullItemPath = path.join(currentDir, item.name);
      const relPath = path.relative(rootDir, fullItemPath);

      if (item.isDirectory()) {
        let childCount = 0;
        try {
          const subChildren = await fs.readdir(fullItemPath);
          childCount = subChildren.length;
        } catch {
          // ignore permission errors
        }

        results.push({
          name: item.name,
          relativePath: relPath,
          isDirectory: true,
          childCount
        });

        if (recursive) {
          const nested = await this.readEntries(rootDir, fullItemPath, recursive, depth + 1);
          results.push(...nested);
        }
      } else {
        let sizeBytes = 0;
        try {
          const s = await fs.stat(fullItemPath);
          sizeBytes = s.size;
        } catch {
          // ignore
        }
        results.push({
          name: item.name,
          relativePath: relPath,
          isDirectory: false,
          sizeBytes
        });
      }
    }

    return results;
  }
}
