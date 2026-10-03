import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { GitCheckpointManager } from "../gitea/GitCheckpointManager.js";

const execAsync = promisify(exec);

describe("GitCheckpointManager Pruning Suite", () => {
  let tempRepo: string;
  let manager: GitCheckpointManager;

  test("setup test git repository", async () => {
    tempRepo = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-cp-test-"));
    await execAsync("git init", { cwd: tempRepo });
    await execAsync('git config user.name "Test Runner"', { cwd: tempRepo });
    await execAsync('git config user.email "test@example.com"', { cwd: tempRepo });
    await fs.writeFile(path.join(tempRepo, "initial.txt"), "hello", "utf-8");
    await execAsync("git add . && git commit -m 'Initial commit'", { cwd: tempRepo });
    manager = new GitCheckpointManager(tempRepo);
    assert.ok(manager);
  });

  test("should create and prune checkpoints by count", async () => {
    // Create 5 shadow checkpoints
    for (let i = 1; i <= 5; i++) {
      await fs.writeFile(path.join(tempRepo, `file-${i}.txt`), `content ${i}`, "utf-8");
      await execAsync(`git add . && git commit -m 'Commit ${i}'`, { cwd: tempRepo });
      await manager.createCheckpoint(`task-${i}`, "stage", `Checkpoint ${i}`);
    }

    const initialList = await manager.listCheckpoints();
    assert.strictEqual(initialList.length, 5);

    // Prune retaining only the 2 most recent checkpoints
    const pruned = await manager.pruneOldCheckpoints(365, 2);
    assert.strictEqual(pruned, 3);

    const remaining = await manager.listCheckpoints();
    assert.strictEqual(remaining.length, 2);
  });

  test("cleanup test git repository", async () => {
    if (tempRepo) {
      await fs.rm(tempRepo, { recursive: true, force: true });
    }
  });
});
