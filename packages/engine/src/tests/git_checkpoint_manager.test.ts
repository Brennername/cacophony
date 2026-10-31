import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import * as childProcess from "node:child_process";
import * as util from "node:util";
import {
  GitCheckpointManager,
} from "../gitea/GitCheckpointManager.js";

const execAsync = util.promisify(childProcess.exec);

describe("GitCheckpointManager Test Suite (T102.3.2)", () => {
  let tempDir: string;
  let manager: GitCheckpointManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-chk-test-"));
    await execAsync("git init", { cwd: tempDir });
    await execAsync("git config user.email test@cacophony.local", { cwd: tempDir });
    await execAsync("git config user.name 'Checkpoint Test'", { cwd: tempDir });

    // Initial commit
    const initFile = path.join(tempDir, "init.txt");
    await fs.writeFile(initFile, "Genesis commit\n", "utf-8");
    await execAsync("git add init.txt", { cwd: tempDir });
    await execAsync("git commit -m 'Genesis'", { cwd: tempDir });

    manager = new GitCheckpointManager(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe("Checkpoint Creation and Reference Storage", () => {
    it("should create shadow checkpoint ref under refs/cacophony/checkpoints namespace", async () => {
      const hash = await manager.createCheckpoint("task-102", "code_gen", "Stage 1 code generation");
      assert.ok(hash.length >= 7);

      const refHash = await manager.getCheckpointRef("task-102", "code_gen");
      assert.strictEqual(refHash, hash);
    });

    it("should allow manually storing and retrieving explicit checkpoint references", async () => {
      const { stdout } = await execAsync("git rev-parse HEAD", { cwd: tempDir });
      const currentHead = stdout.trim();

      await manager.storeCheckpointRef("task-manual", "lint", currentHead);
      const retrieved = await manager.getCheckpointRef("task-manual", "lint");

      assert.strictEqual(retrieved, currentHead);
    });

    it("should return undefined when querying non-existent checkpoint ref", async () => {
      const result = await manager.getCheckpointRef("non-existent", "stage");
      assert.strictEqual(result, undefined);
    });
  });

  describe("Listing and Deletion", () => {
    it("should list checkpoints created for a task", async () => {
      await manager.createCheckpoint("task-batch", "stage-a", "First checkpoint");
      await manager.createCheckpoint("task-batch", "stage-b", "Second checkpoint");

      const list = await manager.listCheckpoints("task-batch");
      assert.strictEqual(list.length, 2);
      assert.ok(list.every((item) => item.hash.length > 0));
    });

    it("should delete checkpoint ref successfully", async () => {
      await manager.createCheckpoint("task-del", "cleanup", "Temporary ref");
      assert.ok(await manager.getCheckpointRef("task-del", "cleanup"));

      await manager.deleteCheckpointRef("task-del", "cleanup");
      assert.strictEqual(await manager.getCheckpointRef("task-del", "cleanup"), undefined);
    });
  });

  describe("Rollback and Working Tree Reversion", () => {
    it("should revert working tree to specified checkpoint state", async () => {
      // Checkpoint at Genesis state
      const genesisHash = await manager.createCheckpoint("task-rev", "base", "Base checkpoint");

      // Mutate file and add another commit
      const initFile = path.join(tempDir, "init.txt");
      await fs.writeFile(initFile, "Mutated content by bad agent\n", "utf-8");
      await execAsync("git add init.txt", { cwd: tempDir });
      await execAsync("git commit -m 'Bad mutation'", { cwd: tempDir });

      // Revert to genesis checkpoint
      await manager.revertToCheckpoint(genesisHash);

      const restoredContent = await fs.readFile(initFile, "utf-8");
      assert.strictEqual(restoredContent, "Genesis commit\n");
    });
  });

  describe("Pruning Old Checkpoints", () => {
    it("should prune checkpoints exceeding maxCount", async () => {
      for (let i = 1; i <= 5; i++) {
        await manager.createCheckpoint("task-prune", `stage-${i}`, `Stage ${i}`);
      }

      const pruned = await manager.pruneOldCheckpoints(30, 2);
      assert.strictEqual(pruned, 3);

      const remaining = await manager.listCheckpoints("task-prune");
      assert.strictEqual(remaining.length, 2);
    });
  });
});
