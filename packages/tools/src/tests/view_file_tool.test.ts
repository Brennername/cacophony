import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { ViewFileTool } from "../implementations/ViewFileTool.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";

describe("ViewFileTool", () => {
  let tempDir: string;
  let tool: ViewFileTool;
  let context: ToolExecutionContext;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-view-tool-test-"));
    tool = new ViewFileTool();
    context = {
      workspaceRoot: tempDir,
      taskId: "task-view-101",
    };

    const lines = Array.from({ length: 50 }, (_, i) => `line content ${i + 1}`).join("\n");
    await fs.writeFile(path.join(tempDir, "sample.txt"), lines, "utf-8");
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should view whole file with line numbering", async () => {
    const result = await tool.execute({ path: "sample.txt" }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("1: line content 1"));
    assert.ok(result.output.includes("50: line content 50"));
  });

  it("should slice specific line range", async () => {
    const result = await tool.execute({ path: "sample.txt", startLine: 10, endLine: 15 }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("10: line content 10"));
    assert.ok(result.output.includes("15: line content 15"));
    assert.ok(!result.output.includes("9: line content 9"));
    assert.ok(!result.output.includes("16: line content 16"));
  });

  it("should reject directory path and recommend list_dir", async () => {
    await fs.mkdir(path.join(tempDir, "subfolder"), { recursive: true });
    const result = await tool.execute({ path: "subfolder" }, context);
    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes("is a directory"));
    assert.ok(result.error.includes("list_dir"));
  });

  it("should inform when startLine exceeds total lines", async () => {
    const result = await tool.execute({ path: "sample.txt", startLine: 100 }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("exceeds total lines"));
  });
});
