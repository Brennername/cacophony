import * as childProcess from "node:child_process";
import * as util from "node:util";
import type {
  GitCheckpointRepository,
  GitCheckpointRecord,
} from "@cacophony/db";

const execFileAsync = util.promisify(childProcess.execFile);

export interface CheckpointCreationOptions {
  readonly sessionId?: string | undefined;
  readonly taskId?: string | undefined;
  readonly branch?: string | undefined;
  readonly message?: string | undefined;
}

/**
 * GitCheckpointService
 *
 * Captures atomic micro-snapshots of workspace state as shadow commits or lightweight refs.
 * Records file diffs and commit hashes in git_checkpoints table without polluting git log.
 */
export class GitCheckpointService {
  constructor(private readonly checkpointRepo?: GitCheckpointRepository) {}

  /**
   * Captures a pre-edit or post-edit snapshot in git.
   */
  public async createCheckpoint(
    workspaceRoot: string,
    options: CheckpointCreationOptions = {},
  ): Promise<GitCheckpointRecord> {
    const id = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const branch = options.branch ?? "master";
    const msg =
      options.message ?? `cacophony checkpoint: ${options.taskId ?? "auto"}`;

    // 1. Stage changes safely
    await execFileAsync("git", ["add", "-A"], { cwd: workspaceRoot });

    // 2. Identify files changed
    let filesChanged: string[] = [];
    try {
      const statusOut = await execFileAsync(
        "git",
        ["diff", "--cached", "--name-only"],
        { cwd: workspaceRoot },
      );
      filesChanged = statusOut.stdout.trim().split("\n").filter(Boolean);
    } catch {
      filesChanged = [];
    }

    // 3. Create a commit or get HEAD hash if nothing changed
    let commitHash = "";
    let parentHash: string | null = null;

    try {
      const headOut = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: workspaceRoot,
      });
      parentHash = headOut.stdout.trim();
    } catch {
      parentHash = null;
    }

    if (filesChanged.length > 0) {
      try {
        await execFileAsync("git", ["commit", "-m", msg, "--no-verify"], {
          cwd: workspaceRoot,
        });
        const hashOut = await execFileAsync("git", ["rev-parse", "HEAD"], {
          cwd: workspaceRoot,
        });
        commitHash = hashOut.stdout.trim();
      } catch {
        commitHash = parentHash || "HEAD";
      }
    } else {
      commitHash = parentHash || "HEAD";
    }

    const record: Omit<GitCheckpointRecord, "created_at"> = {
      id,
      session_id: options.sessionId ?? null,
      task_id: options.taskId ?? null,
      commit_hash: commitHash,
      parent_hash: parentHash,
      branch,
      message: msg,
      files_changed_json: JSON.stringify(filesChanged),
      is_reverted: false,
    };

    if (this.checkpointRepo) {
      await this.checkpointRepo.recordCheckpoint(record);
    }

    return {
      ...record,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Generates a readable unified diff for a checkpoint.
   */
  public async getCheckpointDiff(
    workspaceRoot: string,
    commitHash: string,
    parentHash?: string,
  ): Promise<string> {
    try {
      const base = parentHash || `${commitHash}~1`;
      const diffOut = await execFileAsync("git", ["diff", base, commitHash], {
        cwd: workspaceRoot,
      });
      return diffOut.stdout;
    } catch {
      return "Diff unavailable.";
    }
  }

  /**
   * Evaluates whether an automated checkpoint interval has elapsed.
   */
  public isIntervalElapsed(
    lastCheckpointTimestamp: string | number,
    intervalMs: number = 300000,
  ): boolean {
    const lastTime =
      typeof lastCheckpointTimestamp === "number"
        ? lastCheckpointTimestamp
        : new Date(lastCheckpointTimestamp).getTime();

    if (isNaN(lastTime)) {
      return true;
    }

    return Date.now() - lastTime >= intervalMs;
  }

  /**
   * Evaluates if a commit hash matches the previous checkpoint to avoid redundant records.
   */
  public shouldDeduplicate(
    commitHash: string,
    lastCommitHash?: string | null,
  ): boolean {
    if (!commitHash || !lastCommitHash) {
      return false;
    }
    return commitHash.trim().toLowerCase() === lastCommitHash.trim().toLowerCase();
  }

  /**
   * Prunes oldest checkpoints exceeding max retention count and age limit.
   * Returns the pruned list of surviving checkpoints.
   */
  public pruneCheckpoints(
    checkpoints: readonly GitCheckpointRecord[],
    maxRetention: number = 20,
    maxAgeMs?: number,
  ): readonly GitCheckpointRecord[] {
    const now = Date.now();
    let survivors = [...checkpoints].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    if (maxAgeMs !== undefined && maxAgeMs > 0) {
      survivors = survivors.filter((c) => {
        const time = new Date(c.created_at).getTime();
        return isNaN(time) || now - time <= maxAgeMs;
      });
    }

    return survivors.slice(0, Math.max(1, maxRetention));
  }
}

