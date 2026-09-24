import { z } from "zod";

/**
 * Parameter definition extracted from AST.
 */
export interface FunctionParameterSignature {
  readonly name: string;
  readonly type: string;
  readonly isOptional: boolean;
  readonly defaultValue?: string;
}

/**
 * Method or function signature representation.
 */
export interface CallableSignature {
  readonly name: string;
  readonly parameters: readonly FunctionParameterSignature[];
  readonly returnType: string;
  readonly isAsync: boolean;
  readonly isStatic?: boolean;
}

/**
 * Interface or type contract property.
 */
export interface PropertySignature {
  readonly name: string;
  readonly type: string;
  readonly isOptional: boolean;
  readonly isReadonly: boolean;
}

/**
 * Architectural code signature definition extracted across TypeScript, Java, and Go.
 */
export interface CodeSignatureRecord {
  readonly id: string;
  readonly filePath: string;
  readonly language: "typescript" | "java" | "go" | "rust";
  readonly identifier: string;
  readonly kind: "function" | "class" | "interface" | "type";
  readonly callables: readonly CallableSignature[];
  readonly properties: readonly PropertySignature[];
  readonly rawCompressed: string;
}

/**
 * Query schema for query_data_shape tool.
 */
export const QueryDataShapeParamsSchema = z.object({
  identifier: z.string().describe("Target function, class, or interface name to query data shapes for."),
  filePath: z.string().optional().describe("Optional relative file path constraint.")
});
export type QueryDataShapeParams = z.infer<typeof QueryDataShapeParamsSchema>;

/**
 * Query schema for query_functional_interface tool.
 */
export const QueryFunctionalInterfaceParamsSchema = z.object({
  interfaceName: z.string().describe("Target interface or type name to inspect properties and contracts."),
  filePath: z.string().optional().describe("Optional relative file path constraint.")
});
export type QueryFunctionalInterfaceParams = z.infer<typeof QueryFunctionalInterfaceParamsSchema>;

/**
 * Query schema for query_overload_map tool.
 */
export const QueryOverloadMapParamsSchema = z.object({
  functionName: z.string().describe("Polymorphic or overloaded function name."),
  filePath: z.string().optional().describe("Optional relative file path constraint.")
});
export type QueryOverloadMapParams = z.infer<typeof QueryOverloadMapParamsSchema>;
