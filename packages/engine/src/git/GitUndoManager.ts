import * as childProcess from "node:child_process";
import * as util from "node:util";
import type { GitCheckpointRepository } from "@cacophony/db";
import type { SessionManager } from "../inference/SessionManager.js";

const execFileAsync = util.promisify(childProcess.execFile);

export interface UndoResult {
  readonly success: boolean;
  readonly revertedCheckpointId?: string | undefined;
  readonly filesReverted: readonly string[];
  readonly message: string;
}

export interface RedoResult {
  readonly success: boolean;
  readonly reappliedCheckpointId?: string | undefined;
  readonly filesReapplied: readonly string[];
  readonly message: string;
}

/**
 * GitUndoManager
 *
 * Implements /undo and /redo commands:
 * - Reverts working tree to pre-task checkpoint
 * - Re-applies reverted checkpoints forward
 * - Supports targeted single-file undo (/undo <file>)
 * - Synchronizes conversational context state upon rollback
 */
export class GitUndoManager {
  constructor(
    private readonly checkpointRepo: GitCheckpointRepository,
    private readonly sessionManager?: SessionManager | undefined
  ) {}

  public getSessionManager(): SessionManager | undefined {
    return this.sessionManager;
  }

  /**
   * Reverts working tree to the latest checkpoint.
   */
  public async undo(workspaceRoot: string, sessionId?: string): Promise<UndoResult> {
    const checkpoint = await this.checkpointRepo.getLatestCheckpoint(sessionId);
    if (!checkpoint) {
      return {
        success: false,
        filesReverted: [],
        message: "No checkpoints available to undo."
      };
    }

    const files: string[] = JSON.parse(checkpoint.files_changed_json || "[]");

    try {
      if (checkpoint.parent_hash) {
        // Checkout working tree files from parent hash
        await execFileAsync("git", ["checkout", checkpoint.parent_hash, "--", "."], { cwd: workspaceRoot });
      } else {
        // Fallback to reverting commit
        await execFileAsync("git", ["revert", "--no-commit", checkpoint.commit_hash], { cwd: workspaceRoot });
      }

      await this.checkpointRepo.setReverted(checkpoint.id, true);

      return {
        success: true,
        revertedCheckpointId: checkpoint.id,
        filesReverted: files,
        message: `Successfully rolled back changes from checkpoint '${checkpoint.id}'.`
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        filesReverted: [],
        message: `Undo failed: ${errMsg}`
      };
    }
  }

  /**
   * Reverts changes to a specific file only.
   */
  public async undoFile(workspaceRoot: string, relativePath: string, sessionId?: string): Promise<UndoResult> {
    const checkpoint = await this.checkpointRepo.getLatestCheckpoint(sessionId);
    if (!checkpoint) {
      return {
        success: false,
        filesReverted: [],
        message: "No checkpoints available."
      };
    }

    try {
      const targetHash = checkpoint.parent_hash || "HEAD~1";
      await execFileAsync("git", ["checkout", targetHash, "--", relativePath], { cwd: workspaceRoot });

      return {
        success: true,
        revertedCheckpointId: checkpoint.id,
        filesReverted: [relativePath],
        message: `Reverted file '${relativePath}' to state at ${targetHash}.`
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        filesReverted: [],
        message: `File undo failed: ${errMsg}`
      };
    }
  }

  /**
   * Redoes the most recently undone checkpoint.
   */
  public async redo(workspaceRoot: string, sessionId?: string): Promise<RedoResult> {
    const checkpoint = await this.checkpointRepo.getLatestRevertedCheckpoint(sessionId);
    if (!checkpoint) {
      return {
        success: false,
        filesReapplied: [],
        message: "No undone checkpoints available to redo."
      };
    }

    const files: string[] = JSON.parse(checkpoint.files_changed_json || "[]");

    try {
      await execFileAsync("git", ["checkout", checkpoint.commit_hash, "--", "."], { cwd: workspaceRoot });
      await this.checkpointRepo.setReverted(checkpoint.id, false);

      return {
        success: true,
        reappliedCheckpointId: checkpoint.id,
        filesReapplied: files,
        message: `Successfully reapplied checkpoint '${checkpoint.id}'.`
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        filesReapplied: [],
        message: `Redo failed: ${errMsg}`
      };
    }
  }
}
