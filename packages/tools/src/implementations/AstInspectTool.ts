import * as fs from "node:fs/promises";
import { z } from "zod";
import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { resolveSafePath } from "../utils/pathSecurity.js";

export const AstInspectParamsSchema = z.object({
  path: z.string().describe("Relative or absolute path to the TypeScript/JavaScript or Java source file to inspect."),
  extractTypes: z.boolean().optional().default(true).describe("Whether to extract type and interface definitions.")
});

export type AstInspectParams = z.infer<typeof AstInspectParamsSchema>;

interface ExtractedStructure {
  readonly imports: string[];
  readonly interfaces: string[];
  readonly classes: Array<{ name: string; methods: string[] }>;
  readonly functions: string[];
  readonly exportedMembers: string[];
}

/**
 * Structural syntax inspection tool for extracting high-level signatures,
 * interfaces, classes, and exported members without parsing whole files manually.
 */
export class AstInspectTool implements ICacophonyTool<AstInspectParams> {
  public readonly definition: ToolDefinition = {
    name: "ast_inspect",
    description: "Extract high-level structural declarations (classes, methods, interfaces, exports) from a source file.",
    parameterSchema: AstInspectParamsSchema
  };

  public readonly schema = AstInspectParamsSchema;

  public async execute(params: AstInspectParams, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetPath = resolveSafePath(context.workspaceRoot, params.path);
      const content = await fs.readFile(targetPath, "utf-8");

      const structure = this.extractStructure(content, params.extractTypes ?? true);

      let summary = `Structural Analysis of ${params.path}:\n`;
      summary += `\nImports (${structure.imports.length}):\n` + (structure.imports.map((i) => `  - ${i}`).join("\n") || "  (None)");
      summary += `\n\nExports (${structure.exportedMembers.length}):\n` + (structure.exportedMembers.map((e) => `  - ${e}`).join("\n") || "  (None)");
      if (params.extractTypes) {
        summary += `\n\nInterfaces & Types (${structure.interfaces.length}):\n` + (structure.interfaces.map((i) => `  - ${i}`).join("\n") || "  (None)");
      }
      summary += `\n\nClasses (${structure.classes.length}):\n`;
      if (structure.classes.length === 0) {
        summary += "  (None)";
      } else {
        for (const cls of structure.classes) {
          summary += `  - class ${cls.name}:\n`;
          if (cls.methods.length === 0) {
            summary += "      (No public methods detected)\n";
          } else {
            for (const m of cls.methods) {
              summary += `      * ${m}\n`;
            }
          }
        }
      }

      summary += `\n\nStandalone Functions (${structure.functions.length}):\n` + (structure.functions.map((f) => `  - ${f}`).join("\n") || "  (None)");

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

  private extractStructure(content: string, includeTypes: boolean): ExtractedStructure {
    const lines = content.split("\n");
    const imports: string[] = [];
    const interfaces: string[] = [];
    const classes: Array<{ name: string; methods: string[] }> = [];
    const functions: string[] = [];
    const exportedMembers: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? "";
      if (!line || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) {
        continue;
      }

      // Check imports
      if (line.startsWith("import ") || line.startsWith("import{")) {
        imports.push(line);
      }

      // Check exports
      if (line.startsWith("export ")) {
        exportedMembers.push(line);
      }

      // Check interfaces / types
      if (includeTypes) {
        const interfaceMatch = line.match(/(?:export\s+)?interface\s+([A-Za-z0-9_]+)/);
        if (interfaceMatch && interfaceMatch[1]) {
          interfaces.push(interfaceMatch[1]);
        }
        const typeMatch = line.match(/(?:export\s+)?type\s+([A-Za-z0-9_]+)\s*=/);
        if (typeMatch && typeMatch[1]) {
          interfaces.push(`type ${typeMatch[1]}`);
        }
      }

      // Check classes
      const classMatch = line.match(/(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/);
      if (classMatch && classMatch[1]) {
        if (currentClass) {
          classes.push(currentClass);
        }
        currentClass = { name: classMatch[1], methods: [] };
      }

      // Check class methods or standalone functions
      const methodMatch = line.match(/(?:public|protected|private|async|static|\s)+\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*:\s*([^;{]+)/);
      if (methodMatch && methodMatch[1] && currentClass) {
        currentClass.methods.push(`${methodMatch[1]}(...): ${methodMatch[2]?.trim() ?? "void"}`);
      }

      const fnMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/);
      if (fnMatch && fnMatch[1]) {
        functions.push(fnMatch[1]);
      }
    }

    if (currentClass) {
      classes.push(currentClass);
    }

    return {
      imports,
      interfaces,
      classes,
      functions,
      exportedMembers
    };
  }
}
