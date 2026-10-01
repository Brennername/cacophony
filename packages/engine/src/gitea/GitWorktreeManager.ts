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

export interface TaskBranchOptions {
  readonly priority?: string | undefined;
  readonly slug?: string | undefined;
  readonly targetBranch?: string | undefined;
}

/**
 * Manages isolated ephemeral git worktrees in workspaces/ without polluting
 * the root repository checkout.
 *
 * Implements:
 * - Isolation per task under workspaces/worktree-<taskId>
 * - Branch naming convention: task/<priority>-<taskId>-<slug> branching off targetBranch (default main)
 * - Safe prune and cleanup of worktree directory and local branch on completion/failure
 */
export class GitWorktreeManager {
  private readonly repositoryRoot: string;
  private readonly workspacesRoot: string;

  constructor(repositoryRoot: string, workspacesRoot: string) {
    this.repositoryRoot = path.resolve(repositoryRoot);
    this.workspacesRoot = path.resolve(workspacesRoot);
  }

  /**
   * Generates standardized branch name: task/<priority>-<taskId>-<slug>
   */
  public formatBranchName(taskId: string, options?: TaskBranchOptions): string {
    const priority = (options?.priority || "P1").toLowerCase();
    const rawSlug = options?.slug || "task";
    const cleanSlug = rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30);

    return `task/${priority}-${taskId}-${cleanSlug || "work"}`;
  }

  /**
   * Initializes workspace root directory if not present.
   */
  public async initialize(): Promise<void> {
    await fs.mkdir(this.workspacesRoot, { recursive: true });
    try {
      await execAsync('git config --global --add safe.directory "*"');
      await execAsync('git config --global user.name "Cacophony Engine"');
      await execAsync('git config --global user.email "cacophony@engine.local"');
    } catch {
      // non-fatal
    }
  }

  /**
   * Creates an isolated ephemeral worktree checkout for a given task under workspaces/worktree-<taskId>.
   */
  public async createWorktree(
    taskId: string,
    branchNameOrOptions?: string | TaskBranchOptions,
    baseBranch = "main"
  ): Promise<WorktreeDescriptor> {
    await this.initialize();

    let branchName: string;
    let targetBase = baseBranch;

    if (typeof branchNameOrOptions === "string") {
      branchName = branchNameOrOptions;
    } else {
      branchName = this.formatBranchName(taskId, branchNameOrOptions);
      if (branchNameOrOptions?.targetBranch) {
        targetBase = branchNameOrOptions.targetBranch;
      }
    }

    const worktreePath = path.join(this.workspacesRoot, `worktree-${taskId}`);

    // If directory already exists, clean it up first
    try {
      await fs.rm(worktreePath, { recursive: true, force: true });
    } catch {
      // ignore
    }

    // Ensure branch exists or create from baseBranch
    try {
      await execAsync(`git worktree add -B "${branchName}" "${worktreePath}" "${targetBase}"`, {
        cwd: this.repositoryRoot
      });
    } catch {
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
   * Safely removes and prunes the worktree directory and optional branch.
   */
  public async removeWorktree(
    worktreePath: string,
    options?: { deleteBranch?: boolean | undefined; branchName?: string | undefined } | undefined
  ): Promise<void> {
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

    if (options?.deleteBranch && options.branchName) {
      try {
        await execAsync(`git branch -D "${options.branchName}"`, { cwd: this.repositoryRoot });
      } catch {
        // ignore if already deleted
      }
    }
  }

  /**
   * Cleans up worktrees and branches for terminal tasks (COMPLETED or FAILED).
   */
  public async cleanupTerminalTask(taskId: string, branchName?: string): Promise<void> {
    const worktreePath = path.join(this.workspacesRoot, `worktree-${taskId}`);
    await this.removeWorktree(worktreePath, {
      deleteBranch: Boolean(branchName),
      branchName
    });
  }

  /**
   * Alias for safely removing an ephemeral worktree directory and pruning the git worktree entry.
   */
  public async cleanWorktree(taskId: string, branchName?: string): Promise<void> {
    return this.cleanupTerminalTask(taskId, branchName);
  }
}
