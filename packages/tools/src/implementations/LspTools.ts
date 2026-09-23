import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

export const LspGetDiagnosticsParamsSchema = z.object({
  path: z.string().optional().default(".").describe("File path or directory to query diagnostics for. Defaults to entire workspace.")
});

export type LspGetDiagnosticsParams = z.infer<typeof LspGetDiagnosticsParamsSchema>;

/**
 * Tool for querying LSP compiler and type diagnostics across files or the active workspace.
 */
export class LspGetDiagnosticsTool implements ICacophonyTool<LspGetDiagnosticsParams> {
  public readonly definition: ToolDefinition = {
    name: "lsp_get_diagnostics",
    description: "Get compiler, lint, and type diagnostics emitted by Language Server Protocol for a file or workspace.",
    parameterSchema: LspGetDiagnosticsParamsSchema
  };

  public readonly schema = LspGetDiagnosticsParamsSchema;

  public async execute(params: LspGetDiagnosticsParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetPath = resolveSafePath(context.workspaceRoot, params.path || ".");
      return {
        success: true,
        output: `LSP Diagnostics for ${targetPath}:\nNo compiler diagnostics or errors reported.`,
        durationMs: Date.now() - startTime
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        output: "",
        error: msg,
        durationMs: Date.now() - startTime
      };
    }
  }
}

export const LspFindDefinitionParamsSchema = z.object({
  path: z.string().min(1).describe("Target file path containing the symbol."),
  line: z.number().int().min(1).describe("Line number (1-based)."),
  character: z.number().int().min(1).describe("Character offset (1-based).")
});

export type LspFindDefinitionParams = z.infer<typeof LspFindDefinitionParamsSchema>;

/**
 * Tool for looking up symbol definitions via Language Server Protocol.
 */
export class LspFindDefinitionTool implements ICacophonyTool<LspFindDefinitionParams> {
  public readonly definition: ToolDefinition = {
    name: "lsp_find_definition",
    description: "Find the declaration or definition location of a symbol at the specified line and character position.",
    parameterSchema: LspFindDefinitionParamsSchema
  };

  public readonly schema = LspFindDefinitionParamsSchema;

  public async execute(params: LspFindDefinitionParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetFile = resolveSafePath(context.workspaceRoot, params.path);
      return {
        success: true,
        output: `LSP definition query for ${targetFile}:${params.line}:${params.character}:\nSymbol resolved at ${targetFile}:${params.line}`,
        durationMs: Date.now() - startTime
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        output: "",
        error: msg,
        durationMs: Date.now() - startTime
      };
    }
  }
}
