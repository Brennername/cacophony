import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";
import * as fs from "node:fs/promises";

const execAsync = promisify(exec);

export interface WorktreeDescriptor {
  readonly taskId: string;
  readonly branchName: string;
  readonly worktreePath: string;
}

/**
 * Manages isolated ephemeral git worktrees in workspaces/ without polluting
 * the root repository checkout.
 */
export class GitWorktreeManager {
  private readonly repositoryRoot: string;
  private readonly workspacesRoot: string;

  constructor(repositoryRoot: string, workspacesRoot: string) {
    this.repositoryRoot = path.resolve(repositoryRoot);
    this.workspacesRoot = path.resolve(workspacesRoot);
  }

  /**
   * Initializes workspace root directory if not present.
   */
  public async initialize(): Promise<void> {
    await fs.mkdir(this.workspacesRoot, { recursive: true });
  }

  /**
   * Creates an isolated ephemeral worktree checkout for a given task.
   */
  public async createWorktree(taskId: string, branchName: string, baseBranch = "main"): Promise<WorktreeDescriptor> {
    await this.initialize();
    const worktreePath = path.join(this.workspacesRoot, `task-${taskId}`);

    // If directory already exists, clean it up first
    try {
      await fs.rm(worktreePath, { recursive: true, force: true });
    } catch {
      // ignore
    }

    // Ensure branch exists or create from baseBranch
    try {
      await execAsync(`git worktree add -B "${branchName}" "${worktreePath}" "${baseBranch}"`, {
        cwd: this.repositoryRoot
      });
    } catch (err: unknown) {
      // If baseBranch doesn't exist, try HEAD
      await execAsync(`git worktree add -B "${branchName}" "${worktreePath}" HEAD`, {
        cwd: this.repositoryRoot
      });
    }

    return {
      taskId,
      branchName,
      worktreePath
    };
  }

  /**
   * Commits all changes staged in the worktree.
   */
  public async commitWorktree(worktreePath: string, commitMessage: string): Promise<string> {
    await execAsync(`git add -A`, { cwd: worktreePath });
    const { stdout } = await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      cwd: worktreePath
    });
    return stdout;
  }

  /**
   * Pushes the task branch to remote (Gitea).
   */
  public async pushBranch(worktreePath: string, remote = "origin", branchName: string): Promise<void> {
    await execAsync(`git push -u "${remote}" "${branchName}"`, { cwd: worktreePath });
  }

  /**
   * Safely removes and prunes the worktree directory.
   */
  public async removeWorktree(worktreePath: string): Promise<void> {
    try {
      await execAsync(`git worktree remove --force "${worktreePath}"`, {
        cwd: this.repositoryRoot
      });
    } catch {
      // Fallback manual prune
      try {
        await fs.rm(worktreePath, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }

    try {
      await execAsync(`git worktree prune`, { cwd: this.repositoryRoot });
    } catch {
      // ignore
    }
  }
}
