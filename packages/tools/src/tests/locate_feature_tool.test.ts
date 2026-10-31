import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { LocateFeatureTool } from "../implementations/LocateFeatureTool.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";

describe("LocateFeatureTool", () => {
  let tempDir: string;
  let tool: LocateFeatureTool;
  let context: ToolExecutionContext;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-locate-test-"));
    tool = new LocateFeatureTool();
    context = {
      workspaceRoot: tempDir,
      taskId: "task-locate-101",
    };

    await fs.mkdir(path.join(tempDir, "services"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "models"), { recursive: true });

    await fs.writeFile(
      path.join(tempDir, "services", "BillingService.ts"),
      `export class BillingService {\n  public charge(): void {}\n}\n`,
      "utf-8",
    );

    await fs.writeFile(
      path.join(tempDir, "models", "BillingInvoice.ts"),
      `export interface BillingInvoice {\n  id: string;\n  amount: number;\n}\n`,
      "utf-8",
    );

    await fs.writeFile(
      path.join(tempDir, "services", "Helper.ts"),
      `export function calculateTax(amount: number): number {\n  return amount * 0.1;\n}\n`,
      "utf-8",
    );
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should locate class declarations across workspace", async () => {
    const result = await tool.execute({ path: ".", symbolName: "BillingService", kind: "class" }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("BillingService.ts:1"));
    assert.ok(result.output.includes("[class]"));
  });

  it("should locate interface declarations", async () => {
    const result = await tool.execute({ path: ".", symbolName: "BillingInvoice", kind: "interface" }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("BillingInvoice.ts:1"));
    assert.ok(result.output.includes("[interface]"));
  });

  it("should locate functions with kind='function'", async () => {
    const result = await tool.execute({ path: ".", symbolName: "calculateTax", kind: "function" }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("Helper.ts:1"));
    assert.ok(result.output.includes("[function]"));
  });

  it("should return clean message when symbol is not found", async () => {
    const result = await tool.execute({ path: ".", symbolName: "NonExistentEntity", kind: "any" }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("No declarations found"));
  });

  it("should restrict search scope to specific directory path", async () => {
    const result = await tool.execute({ path: "models", symbolName: "BillingInvoice", kind: "interface" }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("BillingInvoice.ts"));
  });
});
