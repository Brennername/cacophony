import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { ListDirTool } from "../implementations/ListDirTool.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";

describe("ListDirTool", () => {
  let tempDir: string;
  let tool: ListDirTool;
  let context: ToolExecutionContext;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-listdir-test-"));
    tool = new ListDirTool();
    context = {
      workspaceRoot: tempDir,
      taskId: "task-list-101",
    };

    await fs.mkdir(path.join(tempDir, "docs"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "src", "nested"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "README.md"), "# Cacophony\n", "utf-8");
    await fs.writeFile(path.join(tempDir, "docs", "guide.md"), "Guide content\n", "utf-8");
    await fs.writeFile(path.join(tempDir, "src", "index.ts"), "export const x = 1;\n", "utf-8");
    await fs.writeFile(path.join(tempDir, "src", "nested", "deep.ts"), "export const y = 2;\n", "utf-8");
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should list root directory entries non-recursively", async () => {
    const result = await tool.execute({ path: ".", recursive: false }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("[FILE] README.md"));
    assert.ok(result.output.includes("[DIR]  docs"));
    assert.ok(result.output.includes("[DIR]  src"));
    assert.ok(!result.output.includes("deep.ts"));
  });

  it("should list directory contents recursively when requested", async () => {
    const result = await tool.execute({ path: "src", recursive: true }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("index.ts"));
    assert.ok(result.output.includes("nested"));
    assert.ok(result.output.includes("deep.ts"));
  });

  it("should return error when path points to a file instead of a directory", async () => {
    const result = await tool.execute({ path: "README.md", recursive: false }, context);
    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes("not a directory"));
  });
});
