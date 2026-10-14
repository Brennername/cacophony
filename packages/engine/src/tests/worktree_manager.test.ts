import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { GitWorktreeManager } from "../gitea/GitWorktreeManager.js";

const execAsync = promisify(exec);

test("Phase 64: T64.1 Ephemeral Git Worktree Provisioning", async (t) => {
  const tmpBase = await fs.mkdtemp(
    path.join(os.tmpdir(), "cacophony-worktree-unit-"),
  );
  const repoDir = path.join(tmpBase, "repo");
  const workspacesDir = path.join(tmpBase, "workspaces");

  await fs.mkdir(repoDir, { recursive: true });
  await fs.mkdir(workspacesDir, { recursive: true });

  // Initialize a real git repository
  await execAsync("git init -b main", { cwd: repoDir });
  await execAsync('git config user.name "Cacophony Engine"', { cwd: repoDir });
  await execAsync('git config user.email "engine@cacophony.local"', {
    cwd: repoDir,
  });

  // Initial commit
  const initialFilePath = path.join(repoDir, "README.md");
  await fs.writeFile(initialFilePath, "# Main Repository Content\n", "utf-8");
  await execAsync("git add -A && git commit -m 'Initial commit'", {
    cwd: repoDir,
  });

  const worktreeManager = new GitWorktreeManager(repoDir, workspacesDir);

  await t.test("T64.1.2: Formats ephemeral task branch name correctly", () => {
    const branchName = worktreeManager.formatBranchName("task-999", {
      priority: "p0",
      slug: "feat-worktree-isolation",
    });
    assert.strictEqual(
      branchName,
      "task/p0-task-999-feat-worktree-isolation",
      "Branch name should match task/<priority>-<taskId>-<slug> format",
    );
  });

  let createdWorktreePath = "";
  let createdBranchName = "";

  await t.test(
    "T64.1.1 & T64.1.4: Creates ephemeral worktree and isolates file modifications",
    async () => {
      const descriptor = await worktreeManager.createWorktree("task-999", {
        priority: "p0",
        slug: "feat-worktree-isolation",
      });

      createdWorktreePath = descriptor.worktreePath;
      createdBranchName = descriptor.branchName;

      assert.ok(
        descriptor.worktreePath.includes("workspaces/worktree-task-999"),
        "Worktree path should reside in workspaces directory",
      );
      assert.strictEqual(
        descriptor.branchName,
        "task/p0-task-999-feat-worktree-isolation",
      );

      // Verify worktree exists on filesystem
      const stat = await fs.stat(descriptor.worktreePath);
      assert.ok(
        stat.isDirectory(),
        "Worktree path should be a valid directory",
      );

      // Modify a file in the worktree
      const worktreeFile = path.join(descriptor.worktreePath, "feature.txt");
      await fs.writeFile(
        worktreeFile,
        "isolated worktree modification\n",
        "utf-8",
      );

      // Verify root repo does NOT have the modified file
      const rootFile = path.join(repoDir, "feature.txt");
      const rootHasFile = await fs
        .stat(rootFile)
        .then(() => true)
        .catch(() => false);
      assert.strictEqual(
        rootHasFile,
        false,
        "Root repository must not be polluted by worktree modification",
      );

      // Verify getStatus reports untracked/modified file
      const status = await worktreeManager.getStatus(descriptor.worktreePath);
      assert.ok(
        status.includes("feature.txt"),
        "Status should report modified file in worktree",
      );

      // Commit file in worktree
      await worktreeManager.commitWorktree(
        descriptor.worktreePath,
        "feat(core): isolated worktree feature commit",
      );

      // Verify worktree commit exists
      const worktreeHead = await worktreeManager.getHeadCommit(
        descriptor.worktreePath,
      );
      const rootHead = await worktreeManager.getHeadCommit(repoDir);
      assert.notStrictEqual(
        worktreeHead,
        rootHead,
        "Worktree HEAD should advance independently of root repository",
      );
    },
  );

  await t.test(
    "T64.1.3: Clean up and remove git worktree using removeWorktree",
    async () => {
      await worktreeManager.removeWorktree(createdWorktreePath, {
        deleteBranch: true,
        branchName: createdBranchName,
      });

      const dirExists = await fs
        .stat(createdWorktreePath)
        .then(() => true)
        .catch(() => false);
      assert.strictEqual(
        dirExists,
        false,
        "Worktree directory should be completely removed",
      );

      // Verify branch is deleted
      const { stdout: branches } = await execAsync("git branch", {
        cwd: repoDir,
      });
      assert.ok(
        !branches.includes(createdBranchName),
        "Ephemeral branch should be deleted after teardown",
      );
    },
  );

  // Teardown temp directory
  try {
    await fs.rm(tmpBase, { recursive: true, force: true });
  } catch {
    // non-fatal
  }
});
