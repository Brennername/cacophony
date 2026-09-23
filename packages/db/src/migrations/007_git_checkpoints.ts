import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 007: Automated Git Checkpoints and Undo/Redo Snapshots
 *
 * Persists git shadow commit snapshots, parent hashes, modified files,
 * and associated task/session identifiers to power the /undo and /redo engine.
 */
export const migration007: Migration = {
  id: "007_git_checkpoints",
  name: "Create git_checkpoints table for micro-snapshot and undo/redo tracking",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS git_checkpoints (
        id VARCHAR(100) PRIMARY KEY,
        session_id VARCHAR(100),
        task_id VARCHAR(100),
        commit_hash VARCHAR(64) NOT NULL,
        parent_hash VARCHAR(64),
        branch VARCHAR(255) NOT NULL DEFAULT 'master',
        message TEXT NOT NULL,
        files_changed_json TEXT NOT NULL DEFAULT '[]',
        is_reverted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_git_checkpoints_session ON git_checkpoints(session_id);
      CREATE INDEX IF NOT EXISTS idx_git_checkpoints_task ON git_checkpoints(task_id);
      CREATE INDEX IF NOT EXISTS idx_git_checkpoints_commit ON git_checkpoints(commit_hash);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP TABLE IF EXISTS git_checkpoints;
    `);
  }
};
