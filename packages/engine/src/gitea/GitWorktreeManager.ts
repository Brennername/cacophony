import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";
import * as fs from "node:fs/promises";

const execFileAsync = promisify(execFile);

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
    let cleanSlug = rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    while (cleanSlug.startsWith("-")) {
      cleanSlug = cleanSlug.slice(1);
    }
    while (cleanSlug.endsWith("-")) {
      cleanSlug = cleanSlug.slice(0, -1);
    }
    cleanSlug = cleanSlug.slice(0, 30);

    return `task/${priority}-${taskId}-${cleanSlug || "work"}`;
  }

  /**
   * Initializes workspace root directory if not present.
   */
  public async initialize(): Promise<void> {
    await fs.mkdir(this.workspacesRoot, { recursive: true });
    try {
      await execFileAsync("git", ["config", "--global", "--add", "safe.directory", "*"]);
      await execFileAsync("git", ["config", "--global", "user.name", "Cacophony Engine"]);
      await execFileAsync("git", ["config", "--global", "user.email", "cacophony@engine.local"]);
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

    try {
      await execFileAsync("git", ["worktree", "prune"], { cwd: this.repositoryRoot });
    } catch {
      // non-fatal
    }

    // Ensure baseBranch is synced to latest repository HEAD to prevent stale worktree checkouts
    try {
      if (targetBase === "main") {
        await execFileAsync("git", ["branch", "-f", "main", "HEAD"], { cwd: this.repositoryRoot }).catch(() => {});
      }
    } catch {
      // non-fatal
    }

    // Ensure branch exists or create from baseBranch
    try {
      await execFileAsync("git", ["worktree", "add", "-B", branchName, worktreePath, targetBase], {
        cwd: this.repositoryRoot
      });
    } catch {
      // If baseBranch doesn't exist, try HEAD
      await execFileAsync("git", ["worktree", "add", "-B", branchName, worktreePath, "HEAD"], {
        cwd: this.repositoryRoot
      });
    }

    // Symlink root node_modules into worktree so dependencies resolve
    try {
      const rootModules = path.join(this.repositoryRoot, "node_modules");
      const worktreeModules = path.join(worktreePath, "node_modules");
      await fs.symlink(rootModules, worktreeModules, "dir").catch(() => {});

      // Symlink package-level node_modules so workspace dependencies (e.g. Angular CLI builders) resolve
      const packages = ["shared-types", "db", "tools", "engine", "frontend"];
      for (const pkg of packages) {
        const rootPkgModules = path.join(this.repositoryRoot, "packages", pkg, "node_modules");
        const worktreePkgModules = path.join(worktreePath, "packages", pkg, "node_modules");
        const modulesExist = await fs.stat(rootPkgModules).then(() => true).catch(() => false);
        if (modulesExist) {
          await fs.symlink(rootPkgModules, worktreePkgModules, "dir").catch(() => {});
        }

        // Do not share dist outputs between worktrees. Builds mutate these
        // directories, so a task could otherwise consume another checkout's
        // stale or half-written JavaScript and test artifacts.
      }
    } catch {
      // non-fatal
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
    await execFileAsync("git", ["add", "-A"], { cwd: worktreePath });
    await execFileAsync("git", ["reset", "HEAD", "--", "node_modules", "packages/*/dist", "dist"], { cwd: worktreePath }).catch(() => {});
    try {
      const { stdout } = await execFileAsync("git", ["commit", "-m", commitMessage], {
        cwd: worktreePath
      });
      return stdout;
    } catch (err: any) {
      if (
        (err?.stdout && err.stdout.includes("nothing to commit")) ||
        (err?.stderr && err.stderr.includes("nothing to commit")) ||
        (err?.message && err.message.includes("nothing to commit"))
      ) {
        const { stdout } = await execFileAsync(
          "git",
          ["commit", "--allow-empty", "-m", commitMessage],
          { cwd: worktreePath }
        );
        return stdout;
      }
      throw err;
    }
  }

  /**
   * Retrieves the current HEAD commit hash from the worktree or repository root.
   */
  public async getHeadCommit(worktreePath?: string): Promise<string> {
    const cwd = worktreePath ?? this.repositoryRoot;
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd });
    return stdout.trim();
  }

  /**
   * Pushes the task branch to remote (Gitea).
   */
  public async pushBranch(worktreePath: string, remote = "origin", branchName: string): Promise<void> {
    let target = remote;
    try {
      const giteaBase = process.env["GITEA_BASE_URL"];
      if (giteaBase) {
        const { stdout: currentRemoteUrl } = await execFileAsync("git", ["remote", "get-url", remote], { cwd: worktreePath }).catch(() => ({ stdout: "", stderr: "" }));
        if (currentRemoteUrl.includes("localhost:19634") || currentRemoteUrl.includes("127.0.0.1:19634")) {
          target = currentRemoteUrl.trim().replace(/localhost:19634|127\.0\.0\.1:19634/, giteaBase.replace(/^https?:\/\//, ""));
        }
      }
    } catch {
      // non-fatal remote check
    }

    await execFileAsync("git", ["push", "--force", "-u", target, branchName], { cwd: worktreePath });
  }

  /**
   * Safely removes and prunes the worktree directory and optional branch.
   */
  public async removeWorktree(
    worktreePath: string,
    options?: { deleteBranch?: boolean | undefined; branchName?: string | undefined } | undefined
  ): Promise<void> {
    try {
      await execFileAsync("git", ["worktree", "remove", "--force", worktreePath], {
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
      await execFileAsync("git", ["worktree", "prune"], { cwd: this.repositoryRoot });
    } catch {
      // ignore
    }

    if (options?.deleteBranch && options.branchName) {
      try {
        await execFileAsync("git", ["branch", "-D", options.branchName], { cwd: this.repositoryRoot });
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


  public async createIsolatedWorktree(
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

      const worktreePath = path.join(this.workspacesRoot, `isolated-worktree-${taskId}`);

      try {
        await fs.rm(worktreePath, { recursive: true, force: true });
      } catch {
        // Ignore error if directory does not exist
      }

      try {
        await execFileAsync("git", ["worktree", "prune"], { cwd: this.repositoryRoot });
      } catch {
        // Ignore error if pruning fails
      }

      try {
        if (targetBase === "main") {
          await execFileAsync("git", ["branch", "-f", "main", "HEAD"], { cwd: this.repositoryRoot }).catch(() => {});
        }
      } catch {
        // Ignore error if setting base branch fails
      }

      try {
        await execFileAsync("git", ["worktree", "add", "-B", branchName, worktreePath, targetBase], {
          cwd: this.repositoryRoot
        });
      } catch {
        await execFileAsync("git", ["worktree", "add", "-B", branchName, worktreePath, "HEAD"], {
          cwd: this.repositoryRoot
        });
      }

      return {
        taskId,
        branchName,
        worktreePath
      };
    }
}
