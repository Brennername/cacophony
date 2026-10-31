import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { ToolRegistry } from "../ToolRegistry.js";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import type { ToolResult } from "@cacophony/shared-types";

describe("ToolRegistry", () => {
  const dummyContext: ToolExecutionContext = {
    workspaceRoot: "/tmp/virtual-workspace",
    taskId: "task-registry-test",
  };

  it("should initialize with default standard tool suite", () => {
    const registry = new ToolRegistry();
    const defs = registry.getAllDefinitions();
    assert.ok(defs.length >= 15);
    const names = defs.map((d) => d.name);
    assert.ok(names.includes("view_file"));
    assert.ok(names.includes("write_to_file"));
    assert.ok(names.includes("replace_file_content"));
    assert.ok(names.includes("run_command"));
  });

  it("should support dynamic custom tool registration and dispatch", async () => {
    const registry = new ToolRegistry();

    const customParamsSchema = z.object({
      multiplier: z.number(),
      value: z.number(),
    });

    const customTool: ICacophonyTool<z.infer<typeof customParamsSchema>> = {
      definition: {
        name: "calculate_product",
        description: "Multiplies two numbers",
        parameterSchema: customParamsSchema,
      },
      schema: customParamsSchema,
      execute: async (params): Promise<ToolResult> => ({
        success: true,
        output: String(params.multiplier * params.value),
        durationMs: 1,
      }),
    };

    registry.registerTool(customTool);

    const retrieved = registry.getTool("calculate_product");
    assert.ok(retrieved);
    assert.equal(retrieved.definition.name, "calculate_product");

    const execResult = await registry.executeTool(
      {
        toolName: "calculate_product",
        parameters: { multiplier: 6, value: 7 },
      },
      dummyContext,
    );

    assert.equal(execResult.success, true);
    assert.equal(execResult.output, "42");
  });

  it("should return error when attempting to execute an unregistered tool", async () => {
    const registry = new ToolRegistry();
    const result = await registry.executeTool(
      {
        toolName: "unregistered_phantom_tool",
        parameters: {},
      },
      dummyContext,
    );

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes("is not registered in Cacophony ToolRegistry"));
  });

  it("should fail validation when parameters violate tool schema", async () => {
    const registry = new ToolRegistry();
    const result = await registry.executeTool(
      {
        toolName: "write_to_file",
        parameters: {
          invalidField: 123,
        },
      },
      dummyContext,
    );

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes("validation error") || result.error.includes("Invalid"));
  });
});
