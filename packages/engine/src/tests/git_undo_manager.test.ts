import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import * as childProcess from "node:child_process";
import * as util from "node:util";
import type { GitCheckpointRecord, GitCheckpointRepository } from "@cacophony/db";
import { GitUndoManager } from "../git/GitUndoManager.js";

const execFileAsync = util.promisify(childProcess.execFile);

describe("GitUndoManager Test Suite (T102.3.5)", () => {
  let tempDir: string;
  let checkpoints: GitCheckpointRecord[] = [];

  const createMockRepo = (): GitCheckpointRepository => {
    return {
      getLatestCheckpoint: async (sessionId?: string) => {
        const matching = checkpoints.filter(
          (c) => (!sessionId || c.session_id === sessionId) && !c.is_reverted,
        );
        return matching[matching.length - 1];
      },
      getLatestRevertedCheckpoint: async (sessionId?: string) => {
        const matching = checkpoints.filter(
          (c) => (!sessionId || c.session_id === sessionId) && c.is_reverted,
        );
        return matching[matching.length - 1];
      },
      setReverted: async (checkpointId: string, reverted: boolean) => {
        const index = checkpoints.findIndex((c) => c.id === checkpointId);
        if (index !== -1 && checkpoints[index]) {
          checkpoints[index] = { ...checkpoints[index]!, is_reverted: reverted };
        }
      },
    } as unknown as GitCheckpointRepository;
  };

  beforeEach(async () => {
    checkpoints = [];
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-undo-test-"));
    await execFileAsync("git", ["init"], { cwd: tempDir });
    await execFileAsync("git", ["config", "user.email", "test@cacophony.local"], {
      cwd: tempDir,
    });
    await execFileAsync("git", ["config", "user.name", "Cacophony Test Runner"], {
      cwd: tempDir,
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe("Undo Operations", () => {
    it("should return failure when no checkpoints exist", async () => {
      const repo = createMockRepo();
      const undoManager = new GitUndoManager(repo);

      const result = await undoManager.undo(tempDir, "sess-1");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.message, "No checkpoints available to undo.");
      assert.deepStrictEqual(result.filesReverted, []);
    });

    it("should revert working tree to parent commit hash and mark checkpoint as reverted", async () => {
      // Create initial commit
      const testFile = path.join(tempDir, "sample.txt");
      await fs.writeFile(testFile, "Initial content\n", "utf-8");
      await execFileAsync("git", ["add", "sample.txt"], { cwd: tempDir });
      await execFileAsync("git", ["commit", "-m", "Initial commit"], {
        cwd: tempDir,
      });
      const { stdout: parentSha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: tempDir,
      });

      // Create second commit
      await fs.writeFile(testFile, "Updated content by agent\n", "utf-8");
      await execFileAsync("git", ["add", "sample.txt"], { cwd: tempDir });
      await execFileAsync("git", ["commit", "-m", "Agent task mutation"], {
        cwd: tempDir,
      });
      const { stdout: childSha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: tempDir,
      });

      checkpoints.push({
        id: "chk-001",
        session_id: "sess-1",
        task_id: "task-001",
        commit_hash: childSha.trim(),
        parent_hash: parentSha.trim(),
        branch: "master",
        message: "Agent task mutation",
        files_changed_json: JSON.stringify(["sample.txt"]),
        is_reverted: false,
        created_at: new Date().toISOString(),
      });

      const repo = createMockRepo();
      const undoManager = new GitUndoManager(repo);

      const result = await undoManager.undo(tempDir, "sess-1");
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.revertedCheckpointId, "chk-001");
      assert.deepStrictEqual(result.filesReverted, ["sample.txt"]);

      // Verify file content was reverted to parent
      const fileAfterUndo = await fs.readFile(testFile, "utf-8");
      assert.strictEqual(fileAfterUndo, "Initial content\n");

      // Verify checkpoint marked as reverted
      assert.strictEqual(checkpoints[0]?.is_reverted, true);
    });

    it("should revert single file via undoFile without affecting other modified files", async () => {
      const fileA = path.join(tempDir, "fileA.txt");
      const fileB = path.join(tempDir, "fileB.txt");
      await fs.writeFile(fileA, "A initial\n", "utf-8");
      await fs.writeFile(fileB, "B initial\n", "utf-8");
      await execFileAsync("git", ["add", "."], { cwd: tempDir });
      await execFileAsync("git", ["commit", "-m", "Base commit"], { cwd: tempDir });
      const { stdout: parentSha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: tempDir,
      });

      await fs.writeFile(fileA, "A modified\n", "utf-8");
      await fs.writeFile(fileB, "B modified\n", "utf-8");
      await execFileAsync("git", ["add", "."], { cwd: tempDir });
      await execFileAsync("git", ["commit", "-m", "Modified commit"], { cwd: tempDir });
      const { stdout: childSha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: tempDir,
      });

      checkpoints.push({
        id: "chk-multi",
        session_id: "sess-1",
        task_id: "task-multi",
        commit_hash: childSha.trim(),
        parent_hash: parentSha.trim(),
        branch: "master",
        message: "Multiple files modified",
        files_changed_json: JSON.stringify(["fileA.txt", "fileB.txt"]),
        is_reverted: false,
        created_at: new Date().toISOString(),
      });

      const repo = createMockRepo();
      const undoManager = new GitUndoManager(repo);

      const result = await undoManager.undoFile(tempDir, "fileA.txt", "sess-1");
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.filesReverted, ["fileA.txt"]);

      // File A should be reverted to initial
      const contentA = await fs.readFile(fileA, "utf-8");
      assert.strictEqual(contentA, "A initial\n");

      // File B should still be at modified commit state
      const contentB = await fs.readFile(fileB, "utf-8");
      assert.strictEqual(contentB, "B modified\n");
    });
  });

  describe("Redo Operations", () => {
    it("should return failure when no reverted checkpoints exist to redo", async () => {
      const repo = createMockRepo();
      const undoManager = new GitUndoManager(repo);

      const result = await undoManager.redo(tempDir, "sess-1");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.message, "No undone checkpoints available to redo.");
    });

    it("should reapply reverted checkpoint commit and reset reverted status", async () => {
      const testFile = path.join(tempDir, "redo_test.txt");
      await fs.writeFile(testFile, "Base line\n", "utf-8");
      await execFileAsync("git", ["add", "."], { cwd: tempDir });
      await execFileAsync("git", ["commit", "-m", "Base commit"], { cwd: tempDir });
      const { stdout: parentSha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: tempDir,
      });

      await fs.writeFile(testFile, "Reapplied feature line\n", "utf-8");
      await execFileAsync("git", ["add", "."], { cwd: tempDir });
      await execFileAsync("git", ["commit", "-m", "Feature commit"], { cwd: tempDir });
      const { stdout: childSha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: tempDir,
      });

      // Checkout parent to simulate working tree after undo
      await execFileAsync("git", ["checkout", parentSha.trim(), "--", "."], {
        cwd: tempDir,
      });

      checkpoints.push({
        id: "chk-reverted",
        session_id: "sess-1",
        task_id: "task-rev",
        commit_hash: childSha.trim(),
        parent_hash: parentSha.trim(),
        branch: "master",
        message: "Feature commit",
        files_changed_json: JSON.stringify(["redo_test.txt"]),
        is_reverted: true,
        created_at: new Date().toISOString(),
      });

      const repo = createMockRepo();
      const undoManager = new GitUndoManager(repo);

      const redoResult = await undoManager.redo(tempDir, "sess-1");
      assert.strictEqual(redoResult.success, true);
      assert.strictEqual(redoResult.reappliedCheckpointId, "chk-reverted");
      assert.deepStrictEqual(redoResult.filesReapplied, ["redo_test.txt"]);

      // Verify file now contains feature line again
      const content = await fs.readFile(testFile, "utf-8");
      assert.strictEqual(content, "Reapplied feature line\n");

      // Verify is_reverted is reset to false
      assert.strictEqual(checkpoints[0]?.is_reverted, false);
    });
  });
});
