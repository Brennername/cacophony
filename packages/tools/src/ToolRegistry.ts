import type { ToolResult, ToolDefinition, ToolCallRequest } from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "./ICacophonyTool.js";
import { ViewFileTool } from "./implementations/ViewFileTool.js";
import { ReplaceFileContentTool } from "./implementations/ReplaceFileContentTool.js";
import { MultiReplaceFileContentTool } from "./implementations/MultiReplaceFileContentTool.js";
import { WriteToFileTool } from "./implementations/WriteToFileTool.js";
import { ListDirTool } from "./implementations/ListDirTool.js";
import { GrepSearchTool } from "./implementations/GrepSearchTool.js";
import { LocateFeatureTool } from "./implementations/LocateFeatureTool.js";
import { AstInspectTool } from "./implementations/AstInspectTool.js";
import { RegexTool } from "./implementations/RegexTool.js";
import { RunCommandTool } from "./implementations/RunCommandTool.js";
import { LspGetDiagnosticsTool, LspFindDefinitionTool } from "./implementations/LspTools.js";
import { QueryDataShapeTool, QueryFunctionalInterfaceTool, QueryOverloadMapTool } from "./implementations/SignatureTools.js";

/**
 * Registry holding and orchestrating all available Cacophony tools.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ICacophonyTool<any>>();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Registers a tool into the registry.
   */
  public registerTool<T>(tool: ICacophonyTool<T>): void {
    this.tools.set(tool.definition.name, tool);
  }

  /**
   * Retrieves a tool by name.
   */
  public getTool(name: string): ICacophonyTool<any> | undefined {
    return this.tools.get(name);
  }

  /**
   * Returns metadata definitions for all registered tools.
   */
  public getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /**
   * Dispatches a tool execution request validating parameters against Zod schema.
   */
  public async executeTool(request: ToolCallRequest, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(request.toolName);
    if (!tool) {
      return {
        success: false,
        output: "",
        error: `Tool "${request.toolName}" is not registered in Cacophony ToolRegistry.`,
        durationMs: Date.now() - startTime
      };
    }

    const parseResult = tool.schema.safeParse(request.parameters);
    if (!parseResult.success) {
      return {
        success: false,
        output: "",
        error: `Invalid parameters for tool "${request.toolName}": ${parseResult.error.message}`,
        durationMs: Date.now() - startTime
      };
    }

    return tool.execute(parseResult.data, context);
  }

  /**
   * Pre-registers the default standard suite of tools.
   */
  private registerDefaults(): void {
    this.registerTool(new ViewFileTool());
    this.registerTool(new ReplaceFileContentTool());
    this.registerTool(new MultiReplaceFileContentTool());
    this.registerTool(new WriteToFileTool());
    this.registerTool(new ListDirTool());
    this.registerTool(new GrepSearchTool());
    this.registerTool(new LocateFeatureTool());
    this.registerTool(new AstInspectTool());
    this.registerTool(new RegexTool());
    this.registerTool(new RunCommandTool());
    this.registerTool(new LspGetDiagnosticsTool());
    this.registerTool(new LspFindDefinitionTool());
    this.registerTool(new QueryDataShapeTool());
    this.registerTool(new QueryFunctionalInterfaceTool());
    this.registerTool(new QueryOverloadMapTool());
  }
}
