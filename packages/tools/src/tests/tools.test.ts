import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

import { ToolRegistry } from "../ToolRegistry.js";
import { ExecutionGuard } from "../security/ExecutionGuard.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";

describe("Tool Execution Suite & Security Tests", () => {
  let tempDir: string;
  let registry: ToolRegistry;
  let context: ToolExecutionContext;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-tool-test-"));
    registry = new ToolRegistry();
    context = {
      workspaceRoot: tempDir,
      taskId: "test-task-123"
    };
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should register all 15 standard tools in ToolRegistry", () => {
    const defs = registry.getAllDefinitions();
    assert.strictEqual(defs.length, 15);
    const names = defs.map((d) => d.name);
    assert.ok(names.includes("view_file"));
    assert.ok(names.includes("replace_file_content"));
    assert.ok(names.includes("multi_replace_file_content"));
    assert.ok(names.includes("write_to_file"));
    assert.ok(names.includes("list_dir"));
    assert.ok(names.includes("grep_search"));
    assert.ok(names.includes("locate_feature"));
    assert.ok(names.includes("ast_inspect"));
    assert.ok(names.includes("query_data_shape"));
    assert.ok(names.includes("query_functional_interface"));
    assert.ok(names.includes("query_overload_map"));
    assert.ok(names.includes("regex_tool"));
    assert.ok(names.includes("run_command"));
    assert.ok(names.includes("lsp_get_diagnostics"));
    assert.ok(names.includes("lsp_find_definition"));
  });

  it("should safely write and view file contents with line numbers", async () => {
    const writeResult = await registry.executeTool(
      {
        toolName: "write_to_file",
        parameters: {
          path: "src/sample.ts",
          content: "line 1\nline 2\nline 3\nline 4\nline 5",
          overwrite: false
        }
      },
      context
    );
    assert.strictEqual(writeResult.success, true);

    const viewResult = await registry.executeTool(
      {
        toolName: "view_file",
        parameters: {
          path: "src/sample.ts",
          startLine: 2,
          endLine: 4
        }
      },
      context
    );
    assert.strictEqual(viewResult.success, true);
    assert.ok(viewResult.output.includes("2: line 2"));
    assert.ok(viewResult.output.includes("3: line 3"));
    assert.ok(viewResult.output.includes("4: line 4"));
    assert.ok(!viewResult.output.includes("5: line 5"));
  });

  it("should replace file content accurately and reject ambiguous targets", async () => {
    const replaceResult = await registry.executeTool(
      {
        toolName: "replace_file_content",
        parameters: {
          path: "src/sample.ts",
          targetContent: "line 3",
          replacementContent: "line 3 modified"
        }
      },
      context
    );
    assert.strictEqual(replaceResult.success, true);

    const verifyContent = await fs.readFile(path.join(tempDir, "src/sample.ts"), "utf-8");
    assert.ok(verifyContent.includes("line 3 modified"));
  });

  it("should atomically perform multi-chunk replacements", async () => {
    const multiResult = await registry.executeTool(
      {
        toolName: "multi_replace_file_content",
        parameters: {
          path: "src/sample.ts",
          replacementChunks: [
            { targetContent: "line 1", replacementContent: "alpha" },
            { targetContent: "line 5", replacementContent: "omega" }
          ]
        }
      },
      context
    );
    assert.strictEqual(multiResult.success, true);

    const verifyContent = await fs.readFile(path.join(tempDir, "src/sample.ts"), "utf-8");
    assert.ok(verifyContent.includes("alpha"));
    assert.ok(verifyContent.includes("omega"));
  });

  it("should inspect directory and grep for matching tokens", async () => {
    const listResult = await registry.executeTool(
      {
        toolName: "list_dir",
        parameters: {
          path: ".",
          recursive: true
        }
      },
      context
    );
    assert.strictEqual(listResult.success, true);
    assert.ok(listResult.output.includes("src/sample.ts"));

    const grepResult = await registry.executeTool(
      {
        toolName: "grep_search",
        parameters: {
          path: ".",
          pattern: "alpha"
        }
      },
      context
    );
    assert.strictEqual(grepResult.success, true);
    assert.ok(grepResult.output.includes("src/sample.ts:1: alpha"));
  });

  it("should block directory traversal path attacks", async () => {
    const badPathResult = await registry.executeTool(
      {
        toolName: "view_file",
        parameters: {
          path: "../../etc/passwd"
        }
      },
      context
    );
    assert.strictEqual(badPathResult.success, false);
    assert.ok(badPathResult.error?.includes("Security Violation"));
  });

  it("should block forbidden destructive commands in ExecutionGuard and RunCommandTool", async () => {
    const guard = new ExecutionGuard();
    assert.strictEqual(guard.evaluate("rm -rf /").isAllowed, false);
    assert.strictEqual(guard.evaluate("sudo apt update").isAllowed, false);
    assert.strictEqual(guard.evaluate("git reset --hard HEAD~1").isAllowed, false);
    assert.strictEqual(guard.evaluate("git push origin main --force").isAllowed, false);
    assert.strictEqual(guard.evaluate("npm test").isAllowed, true);

    const rmToolResult = await registry.executeTool(
      {
        toolName: "run_command",
        parameters: {
          command: "rm src/sample.ts"
        }
      },
      context
    );
    assert.strictEqual(rmToolResult.success, false);
    assert.ok(rmToolResult.error?.includes("Execution Guard Violation"));
  });
});
