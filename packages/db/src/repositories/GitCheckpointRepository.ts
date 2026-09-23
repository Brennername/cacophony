import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

export interface GitCheckpointRecord {
  readonly id: string;
  readonly session_id: string | null;
  readonly task_id: string | null;
  readonly commit_hash: string;
  readonly parent_hash: string | null;
  readonly branch: string;
  readonly message: string;
  readonly files_changed_json: string;
  readonly is_reverted: boolean;
  readonly created_at: string;
}

/**
 * GitCheckpointRepository
 *
 * Persists and indexes automated git checkpoint micro-snapshots,
 * enabling session rollback, /undo, and /redo state traversal.
 */
export class GitCheckpointRepository {
  constructor(private readonly driver: IDatabaseDriver) {}

  public async recordCheckpoint(
    checkpoint: Omit<GitCheckpointRecord, "created_at">
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.query(
      `INSERT INTO git_checkpoints (
        id, session_id, task_id, commit_hash, parent_hash,
        branch, message, files_changed_json, is_reverted, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        checkpoint.id,
        checkpoint.session_id,
        checkpoint.task_id,
        checkpoint.commit_hash,
        checkpoint.parent_hash,
        checkpoint.branch,
        checkpoint.message,
        checkpoint.files_changed_json,
        checkpoint.is_reverted,
        now
      ]
    );
  }

  public async getLatestCheckpoint(sessionId?: string): Promise<GitCheckpointRecord | undefined> {
    const query = sessionId
      ? `SELECT * FROM git_checkpoints WHERE session_id = $1 AND is_reverted = FALSE ORDER BY created_at DESC LIMIT 1`
      : `SELECT * FROM git_checkpoints WHERE is_reverted = FALSE ORDER BY created_at DESC LIMIT 1`;
    const params = sessionId ? [sessionId] : [];
    const res = await this.driver.query<GitCheckpointRecord>(query, params);
    return res[0];
  }

  public async getLatestRevertedCheckpoint(sessionId?: string): Promise<GitCheckpointRecord | undefined> {
    const query = sessionId
      ? `SELECT * FROM git_checkpoints WHERE session_id = $1 AND is_reverted = TRUE ORDER BY created_at DESC LIMIT 1`
      : `SELECT * FROM git_checkpoints WHERE is_reverted = TRUE ORDER BY created_at DESC LIMIT 1`;
    const params = sessionId ? [sessionId] : [];
    const res = await this.driver.query<GitCheckpointRecord>(query, params);
    return res[0];
  }

  public async setReverted(id: string, isReverted: boolean): Promise<void> {
    await this.driver.query(
      `UPDATE git_checkpoints SET is_reverted = $1 WHERE id = $2`,
      [isReverted, id]
    );
  }

  public async listCheckpoints(sessionId?: string, limit = 50): Promise<readonly GitCheckpointRecord[]> {
    const query = sessionId
      ? `SELECT * FROM git_checkpoints WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2`
      : `SELECT * FROM git_checkpoints ORDER BY created_at DESC LIMIT $1`;
    const params = sessionId ? [sessionId, limit] : [limit];
    return this.driver.query<GitCheckpointRecord>(query, params);
  }
}
