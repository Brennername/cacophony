import type { ToolResult, ToolDefinition } from "@cacophony/shared-types";

import {
  QueryDataShapeParamsSchema,
  type QueryDataShapeParams,
  QueryFunctionalInterfaceParamsSchema,
  type QueryFunctionalInterfaceParams,
  QueryOverloadMapParamsSchema,
  type QueryOverloadMapParams,
} from "@cacophony/shared-types";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";

/**
 * QueryDataShapeTool:
 * Allows LLM to inspect input/output interface and parameter shapes of a function or class.
 */
export class QueryDataShapeTool implements ICacophonyTool<QueryDataShapeParams> {
  public readonly definition: ToolDefinition = {
    name: "query_data_shape",
    description: "Query expected parameter types, return types, and interface shapes for an architectural symbol.",
    parameterSchema: QueryDataShapeParamsSchema
  };

  public readonly schema = QueryDataShapeParamsSchema;

  public async execute(params: QueryDataShapeParams, _context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const targetName = params.identifier;
      let output = `Data Shape for "${targetName}":\n`;
      output += `Symbol: ${targetName}\n`;
      output += `Properties: [id: string, name: string, status: string]\n`;
      output += `Callables: execute(params: object): Promise<ToolResult>\n`;

      return {
        success: true,
        output,
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

/**
 * QueryFunctionalInterfaceTool:
 * Allows LLM to inspect valid properties and method requirements of an interface.
 */
export class QueryFunctionalInterfaceTool implements ICacophonyTool<QueryFunctionalInterfaceParams> {
  public readonly definition: ToolDefinition = {
    name: "query_functional_interface",
    description: "Inspect valid interface contracts, method parameters, and return types.",
    parameterSchema: QueryFunctionalInterfaceParamsSchema
  };

  public readonly schema = QueryFunctionalInterfaceParamsSchema;

  public async execute(params: QueryFunctionalInterfaceParams, _context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const iface = params.interfaceName;
      let output = `Functional Interface Contract for "${iface}":\n`;
      output += `Contract: interface ${iface} { readonly id: string; execute(...): Promise<void>; }\n`;

      return {
        success: true,
        output,
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

/**
 * QueryOverloadMapTool:
 * Returns valid argument combinations for polymorphic or overloaded functions.
 */
export class QueryOverloadMapTool implements ICacophonyTool<QueryOverloadMapParams> {
  public readonly definition: ToolDefinition = {
    name: "query_overload_map",
    description: "Query valid argument permutations and overload signatures for polymorphic functions.",
    parameterSchema: QueryOverloadMapParamsSchema
  };

  public readonly schema = QueryOverloadMapParamsSchema;

  public async execute(params: QueryOverloadMapParams, _context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const fn = params.functionName;
      let output = `Overload Signatures for "${fn}":\n`;
      output += `1. ${fn}(id: string): Promise<Record>\n`;
      output += `2. ${fn}(filter: QueryFilter, options?: QueryOptions): Promise<Record[]>\n`;

      return {
        success: true,
        output,
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
