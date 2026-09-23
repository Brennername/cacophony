import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as childProcess from "node:child_process";
import * as util from "node:util";
import { PGliteDriver, MigrationRunner, GitCheckpointRepository } from "@cacophony/db";
import { GitCheckpointService } from "../git/GitCheckpointService.js";
import { GitUndoManager } from "../git/GitUndoManager.js";

const execFileAsync = util.promisify(childProcess.execFile);

describe("Phase 12: Automated Git Checkpoints & Undo/Redo Engine", () => {
  let tempDir: string;
  let driver: PGliteDriver;
  let repo: GitCheckpointRepository;
  let checkpointService: GitCheckpointService;
  let undoManager: GitUndoManager;

  before(async () => {
    // 1. Prepare temp git workspace
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-git-test-"));
    await execFileAsync("git", ["init"], { cwd: tempDir });
    await execFileAsync("git", ["config", "user.name", "Cacophony Engine"], { cwd: tempDir });
    await execFileAsync("git", ["config", "user.email", "engine@cacophony.local"], { cwd: tempDir });

    // Initial commit
    await fs.writeFile(path.join(tempDir, "file1.txt"), "Initial file1 content\n");
    await execFileAsync("git", ["add", "file1.txt"], { cwd: tempDir });
    await execFileAsync("git", ["commit", "-m", "Initial commit"], { cwd: tempDir });

    // 2. Database driver
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();

    repo = new GitCheckpointRepository(driver);
    checkpointService = new GitCheckpointService(repo);
    undoManager = new GitUndoManager(repo);
  });

  after(async () => {
    await driver.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("should create checkpoint and record changes in database", async () => {
    await fs.writeFile(path.join(tempDir, "file1.txt"), "Modified file1 content\n");
    await fs.writeFile(path.join(tempDir, "file2.txt"), "New file2 content\n");

    const checkpoint = await checkpointService.createCheckpoint(tempDir, {
      sessionId: "session-123",
      taskId: "task-abc",
      message: "Checkpoint edit 1"
    });

    assert.ok(checkpoint.id);
    assert.ok(checkpoint.commit_hash);
    const files = JSON.parse(checkpoint.files_changed_json);
    assert.ok(files.includes("file1.txt"));
    assert.ok(files.includes("file2.txt"));

    const latest = await repo.getLatestCheckpoint("session-123");
    assert.ok(latest);
    assert.equal(latest?.id, checkpoint.id);
  });

  test("should perform undo and restore working tree to parent snapshot", async () => {
    // Verify file exists before undo
    const preContent = await fs.readFile(path.join(tempDir, "file1.txt"), "utf-8");
    assert.equal(preContent, "Modified file1 content\n");

    // Perform undo
    const undoResult = await undoManager.undo(tempDir, "session-123");
    assert.equal(undoResult.success, true);

    const postContent = await fs.readFile(path.join(tempDir, "file1.txt"), "utf-8");
    assert.equal(postContent, "Initial file1 content\n");
  });

  test("should perform redo and re-apply reverted checkpoint forward", async () => {
    const redoResult = await undoManager.redo(tempDir, "session-123");
    assert.equal(redoResult.success, true);

    const postRedoContent = await fs.readFile(path.join(tempDir, "file1.txt"), "utf-8");
    assert.equal(postRedoContent, "Modified file1 content\n");
  });
});
