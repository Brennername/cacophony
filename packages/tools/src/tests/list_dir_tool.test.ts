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
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-listdir-test-"));

    // Initialize the ListDirTool and set up the execution context
    tool = new ListDirTool();
    context = {
      workspaceRoot: tempDir,
      taskId: "task-list-101",
    };

    // Create a directory structure with files for testing
    await fs.mkdir(path.join(tempDir, "docs"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "src", "nested"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "README.md"), "# Cacophony\n", "utf-8");
    await fs.writeFile(path.join(tempDir, "docs", "guide.md"), "Guide content\n", "utf-8");
    await fs.writeFile(path.join(tempDir, "src", "index.ts"), "export const x = 1;\n", "utf-8");
    await fs.writeFile(path.join(tempDir, "src", "nested", "deep.ts"), "export const y = 2;\n", "utf-8");
  });

  after(async () => {
    // Clean up the temporary directory after tests
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should list root directory entries non-recursively", async () => {
    const result = await tool.execute({ path: ".", recursive: false }, context);

    // Assert that the operation was successful and check for expected files/directories
    assert.equal(result.success, true);
    assert.ok(result.output.includes("[FILE] README.md"));
    assert.ok(result.output.includes("[DIR]  docs"));
    assert.ok(result.output.includes("[DIR]  src"));
    assert.ok(!result.output.includes("deep.ts")); // Ensure deep file is not listed non-recursively
  });

  it("should list directory contents recursively when requested", async () => {
    const result = await tool.execute({ path: "src", recursive: true }, context);

    // Assert that the operation was successful and check for expected files/directories
    assert.equal(result.success, true);
    assert.ok(result.output.includes("index.ts"));
    assert.ok(result.output.includes("nested"));
    assert.ok(result.output.includes("deep.ts")); // Ensure deep file is listed recursively
  });

  it("should return error when path points to a file instead of a directory", async () => {
    const result = await tool.execute({ path: "README.md", recursive: false }, context);

    // Assert that the operation failed and check for expected error message
    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes("not a directory"));
  });
});
