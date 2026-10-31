import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { WriteToFileTool } from "../implementations/WriteToFileTool.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";

describe("WriteToFileTool", () => {
  let tempDir: string;
  let tool: WriteToFileTool;
  let context: ToolExecutionContext;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-write-tool-test-"));
    tool = new WriteToFileTool();
    context = {
      workspaceRoot: tempDir,
      taskId: "task-write-101",
    };
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should create new file with content and auto-create parent directories", async () => {
    const relativePath = "nested/deep/folder/config.json";
    const content = '{"enabled": true, "port": 8080}';

    const result = await tool.execute({ path: relativePath, content, overwrite: false }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("successfully written"));

    const fullPath = path.join(tempDir, relativePath);
    const read = await fs.readFile(fullPath, "utf-8");
    assert.equal(read, content);
  });

  it("should refuse to overwrite existing file without overwrite flag", async () => {
    const relativePath = "locked.txt";
    await fs.writeFile(path.join(tempDir, relativePath), "initial data", "utf-8");

    const result = await tool.execute(
      { path: relativePath, content: "overwritten data", overwrite: false },
      context,
    );

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes("already exists"));

    const preserved = await fs.readFile(path.join(tempDir, relativePath), "utf-8");
    assert.equal(preserved, "initial data");
  });

  it("should overwrite existing file when overwrite is true", async () => {
    const relativePath = "updateable.txt";
    await fs.writeFile(path.join(tempDir, relativePath), "v1", "utf-8");

    const result = await tool.execute(
      { path: relativePath, content: "v2", overwrite: true },
      context,
    );

    assert.equal(result.success, true);
    const updated = await fs.readFile(path.join(tempDir, relativePath), "utf-8");
    assert.equal(updated, "v2");
  });

  it("should reject path traversal outside workspace root", async () => {
    const result = await tool.execute(
      { path: "../../../etc/shadow_fake.txt", content: "malicious", overwrite: true },
      context,
    );

    assert.equal(result.success, false);
    assert.ok(result.error?.includes("Security Violation") || result.error?.includes("escape workspace root"));
  });
});
