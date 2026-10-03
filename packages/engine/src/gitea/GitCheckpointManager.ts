import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export const CHECKPOINT_REF_PREFIX = "refs/cacophony/checkpoints";

export interface CheckpointRecord {
  readonly id: string;
  readonly hash: string;
  readonly message: string;
  readonly createdAt: string;
  readonly filesChanged: number;
  readonly taskId?: string;
  readonly stageName?: string;
}

/**
 * GitCheckpointManager
 *
 * Manages git shadow checkpoints under hidden refs/cacophony/checkpoints/ namespace,
 * allowing instant atomic rollback without polluting repository commit history.
 */
export class GitCheckpointManager {
  private readonly repositoryRoot: string;

  constructor(repositoryRoot: string) {
    this.repositoryRoot = repositoryRoot;
  }

  /**
   * Creates a shadow checkpoint ref for a specific task and pipeline stage.
   */
  public async createCheckpoint(taskId: string, stageName: string, message: string): Promise<string> {
    const ref = `${CHECKPOINT_REF_PREFIX}/${taskId}-${stageName}`;
    try {
      const { stdout: commitHash } = await execAsync("git rev-parse HEAD", { cwd: this.repositoryRoot });
      const hash = commitHash.trim();
      await execAsync(`git update-ref ${ref} ${hash}`, { cwd: this.repositoryRoot });
      return hash;
    } catch (err) {
      console.warn(`[GitCheckpointManager] Failed to create checkpoint ${ref} (${message}):`, err);
      return "";
    }
  }

  /**
   * Lists chronological shadow checkpoints.
   */
  public async listCheckpoints(taskId?: string): Promise<CheckpointRecord[]> {
    try {
      const pattern = taskId ? `${CHECKPOINT_REF_PREFIX}/${taskId}-*` : `${CHECKPOINT_REF_PREFIX}/*`;
      const { stdout } = await execAsync(
        `git for-each-ref --format="%(refname) %(objectname) %(contents:subject)" ${pattern}`,
        { cwd: this.repositoryRoot }
      );
      const lines = stdout.trim().split("\n").filter(Boolean);
      return lines.map((line, idx) => {
        const [, hash = "", ...rest] = line.split(" ");
        return {
          id: `cp-${idx + 1}`,
          hash,
          message: rest.join(" ") || "Shadow stage checkpoint",
          createdAt: new Date().toISOString(),
          filesChanged: 1
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Reverts the working directory to a specific checkpoint ref or commit hash.
   */
  public async revertToCheckpoint(checkpointId: string): Promise<void> {
    await execAsync(`git checkout ${checkpointId} -- .`, { cwd: this.repositoryRoot });
  }

  /**
   * Stores a checkpoint reference under the hidden namespace.
   */
  public async storeCheckpointRef(taskId: string, stageName: string, ref: string): Promise<void> {
    const checkpointRef = `${CHECKPOINT_REF_PREFIX}/${taskId}-${stageName}`;
    try {
      await execAsync(`git update-ref ${checkpointRef} ${ref}`, { cwd: this.repositoryRoot });
    } catch (err) {
      console.warn(`[GitCheckpointManager] Failed to store ref ${checkpointRef}:`, err);
    }
  }

  /**
   * Retrieves a checkpoint reference from the hidden namespace.
   */
  public async getCheckpointRef(taskId: string, stageName: string): Promise<string | undefined> {
    const checkpointRef = `${CHECKPOINT_REF_PREFIX}/${taskId}-${stageName}`;
    try {
      const { stdout } = await execAsync(`git rev-parse ${checkpointRef}`, { cwd: this.repositoryRoot });
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Deletes a checkpoint reference from the hidden namespace.
   */
  public async deleteCheckpointRef(taskId: string, stageName: string): Promise<void> {
    const checkpointRef = `${CHECKPOINT_REF_PREFIX}/${taskId}-${stageName}`;
    try {
      await execAsync(`git update-ref -d ${checkpointRef}`, { cwd: this.repositoryRoot });
    } catch {
      // Ignored
    }
  }

  /**
   * Prunes shadow checkpoint references that are older than maxAgeDays or exceed maxCount.
   *
   * @param maxAgeDays The maximum age in days before a checkpoint ref is pruned.
   * @param maxCount The maximum number of recent checkpoints to retain.
   * @returns The number of pruned checkpoint references.
   */
  public async pruneOldCheckpoints(maxAgeDays: number, maxCount: number): Promise<number> {
    try {
      const pattern = `${CHECKPOINT_REF_PREFIX}/*`;
      const format = "%(refname) %(creatordate:iso8601)";
      const { stdout } = await execAsync(
        `git for-each-ref --format="${format}" --sort=-creatordate ${pattern}`,
        { cwd: this.repositoryRoot }
      );

      const lines = stdout.trim().split("\n").filter(Boolean);
      if (lines.length === 0) {
        return 0;
      }

      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      let prunedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const [refname = "", ...dateParts] = line.split(" ");
        if (!refname) continue;

        const dateStr = dateParts.join(" ");
        const refTime = dateStr ? new Date(dateStr).getTime() : now;
        const isOverAge = now - refTime > maxAgeMs;
        const isOverCount = i >= maxCount;

        if (isOverAge || isOverCount) {
          try {
            await execAsync(`git update-ref -d ${refname}`, { cwd: this.repositoryRoot });
            prunedCount++;
          } catch {
            // Ignored per-ref deletion error
          }
        }
      }

      return prunedCount;
    } catch (err) {
      console.warn("[GitCheckpointManager] Error pruning old checkpoints:", err);
      return 0;
    }
  }
}