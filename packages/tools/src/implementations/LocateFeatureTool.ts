import * as fs from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

export const LocateFeatureParamsSchema = z.object({
  path: z.string().default(".").describe("Directory or file to search."),
  symbolName: z.string().min(1).describe("Name of the symbol, interface, class, method, or function to find."),
  kind: z.enum(["class", "interface", "function", "type", "const", "enum", "any"]).optional().default("any")
    .describe("Optional syntactic filter: class, interface, function, type, const, enum, or any.")
});

export type LocateFeatureParams = z.infer<typeof LocateFeatureParamsSchema>;

interface SymbolOccurrence {
  readonly file: string;
  readonly lineNumber: number;
  readonly kind: string;
  readonly declarationSnippet: string;
}

/**
 * Tool for locating declarations of symbols, classes, functions, and interfaces across the workspace.
 */
export class LocateFeatureTool implements ICacophonyTool<LocateFeatureParams> {
  public readonly definition: ToolDefinition = {
    name: "locate_feature",
    description: "Find definitions and declarations of symbols, classes, interfaces, types, and functions in code.",
    parameterSchema: LocateFeatureParamsSchema
  };

  public readonly schema = LocateFeatureParamsSchema;

  public async execute(params: LocateFeatureParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetPath = resolveSafePath(context.workspaceRoot, params.path);
      const symbolPatterns = this.buildPatterns(params.symbolName, params.kind);

      const occurrences: SymbolOccurrence[] = [];
      await this.scanFiles(targetPath, context.workspaceRoot, symbolPatterns, occurrences);

      if (occurrences.length === 0) {
        return {
          success: true,
          output: `No declarations found for symbol "${params.symbolName}" with kind "${params.kind}".`,
          durationMs: Date.now() - startTime
        };
      }

      const formatted = occurrences
        .map((o) => `${o.file}:${o.lineNumber} [${o.kind}] ${o.declarationSnippet}`)
        .join("\n");

      return {
        success: true,
        output: `Found ${occurrences.length} declarations for "${params.symbolName}":\n\n${formatted}`,
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

  private buildPatterns(symbolName: string, kind: string): Array<{ kind: string; regex: RegExp }> {
    const escaped = symbolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns: Array<{ kind: string; regex: RegExp }> = [];

    if (kind === "class" || kind === "any") {
      patterns.push({ kind: "class", regex: new RegExp(`\\b(class|abstract\\s+class)\\s+${escaped}\\b`) });
    }
    if (kind === "interface" || kind === "any") {
      patterns.push({ kind: "interface", regex: new RegExp(`\\binterface\\s+${escaped}\\b`) });
    }
    if (kind === "type" || kind === "any") {
      patterns.push({ kind: "type", regex: new RegExp(`\\btype\\s+${escaped}\\b`) });
    }
    if (kind === "enum" || kind === "any") {
      patterns.push({ kind: "enum", regex: new RegExp(`\\benum\\s+${escaped}\\b`) });
    }
    if (kind === "function" || kind === "any") {
      patterns.push({ kind: "function", regex: new RegExp(`\\b(function|async\\s+function)\\s+${escaped}\\b`) });
      patterns.push({ kind: "method", regex: new RegExp(`\\b(public|private|protected|async|static)*\\s*${escaped}\\s*\\(`) });
    }
    if (kind === "const" || kind === "any") {
      patterns.push({ kind: "const", regex: new RegExp(`\\b(const|let|var)\\s+${escaped}\\b`) });
    }

    return patterns;
  }

  private async scanFiles(
    currentPath: string,
    workspaceRoot: string,
    patterns: Array<{ kind: string; regex: RegExp }>,
    results: SymbolOccurrence[]
  ): Promise<void> {
    let stat;
    try {
      stat = await fs.stat(currentPath);
    } catch {
      return;
    }

    if (stat.isDirectory()) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") {
          continue;
        }
        await this.scanFiles(path.join(currentPath, entry.name), workspaceRoot, patterns, results);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(currentPath);
      if (![".ts", ".js", ".tsx", ".jsx", ".java"].includes(ext)) {
        return;
      }

      try {
        const content = await fs.readFile(currentPath, "utf-8");
        const lines = content.split("\n");
        const relPath = path.relative(workspaceRoot, currentPath);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          for (const p of patterns) {
            if (p.regex.test(line)) {
              results.push({
                file: relPath,
                lineNumber: i + 1,
                kind: p.kind,
                declarationSnippet: line.trim()
              });
              break;
            }
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  }
}
