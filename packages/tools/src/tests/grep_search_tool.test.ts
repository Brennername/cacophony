import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { GrepSearchTool } from "../implementations/GrepSearchTool.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";

describe("GrepSearchTool", () => {
  let tempDir: string;
  let tool: GrepSearchTool;
  let context: ToolExecutionContext;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-grep-test-"));
    tool = new GrepSearchTool();
    context = {
      workspaceRoot: tempDir,
      taskId: "task-grep-101",
    };

    await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "src", "Auth.ts"),
      "const AUTH_TOKEN = 'secret-123';\nfunction authenticate() {}\n",
      "utf-8",
    );
    await fs.writeFile(
      path.join(tempDir, "src", "Notes.txt"),
      "auth notes: do not commit tokens\n",
      "utf-8",
    );
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should find plain text matches across files with line numbers", async () => {
    const result = await tool.execute({ path: ".", pattern: "AUTH_TOKEN", isRegex: false, caseInsensitive: false }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("Auth.ts:1"));
    assert.ok(result.output.includes("AUTH_TOKEN"));
  });

  it("should support regex pattern matches", async () => {
    const result = await tool.execute({ path: ".", pattern: "function\\s+auth\\w+", isRegex: true, caseInsensitive: false }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("Auth.ts:2"));
    assert.ok(result.output.includes("function authenticate()"));
  });

  it("should support case-insensitive searches", async () => {
    const result = await tool.execute({ path: ".", pattern: "auth", isRegex: false, caseInsensitive: true }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("Auth.ts"));
    assert.ok(result.output.includes("Notes.txt"));
  });

  it("should filter results by includes extension patterns", async () => {
    const result = await tool.execute(
      { path: ".", pattern: "auth", isRegex: false, caseInsensitive: true, includes: [".ts"] },
      context,
    );
    assert.equal(result.success, true);
    assert.ok(result.output.includes("Auth.ts"));
    assert.ok(!result.output.includes("Notes.txt"));
  });

  it("should report zero matches cleanly", async () => {
    const result = await tool.execute({ path: ".", pattern: "non_existent_token_pattern_123", isRegex: false, caseInsensitive: false }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("No matches found"));
  });
});
