import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { RunCommandTool } from "../implementations/RunCommandTool.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";

describe("RunCommandTool", () => {
  let tempDir: string;
  let tool: RunCommandTool;
  let context: ToolExecutionContext;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-runcmd-test-"));
    tool = new RunCommandTool();
    context = {
      workspaceRoot: tempDir,
      taskId: "task-cmd-101",
    };
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should execute safe shell commands and capture output", async () => {
    const result = await tool.execute({ command: "echo 'cacophony-worker-active'", cwd: ".", timeoutMs: 180000 }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("cacophony-worker-active"));
  });

  it("should block dangerous destructive commands via ExecutionGuard", async () => {
    const dangerousCommands = [
      "rm -rf /",
      "rm -rf src/",
      "sudo apt-get install",
      "git clean -fd",
      "mkfs.ext4 /dev/sda",
    ];

    for (const cmd of dangerousCommands) {
      const result = await tool.execute({ command: cmd, cwd: ".", timeoutMs: 180000 }, context);
      assert.equal(result.success, false, `Expected '${cmd}' to be blocked`);
      assert.ok(result.error);
    }
  });

  it("should capture non-zero exit codes as failure with error output", async () => {
    const result = await tool.execute({ command: "node -e 'process.exit(1)'", cwd: ".", timeoutMs: 180000 }, context);
    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  it("should execute within specified relative working directory", async () => {
    await fs.mkdir(path.join(tempDir, "sub_working_dir"), { recursive: true });
    const result = await tool.execute({ command: "pwd", cwd: "sub_working_dir", timeoutMs: 180000 }, context);
    assert.equal(result.success, true);
    assert.ok(result.output.includes("sub_working_dir"));
  });
});
