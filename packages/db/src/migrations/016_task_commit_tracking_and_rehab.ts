import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 016: Task Commit Tracking and Rehabilitation Schema
 *
 * Adds columns to track:
 * - commit_hash: Git commit hash produced when task changes are successfully committed/merged
 * - base_commit_hash: Base git commit hash of repository when task execution started
 * - failure_reason: Structured diagnostic reason or failure category
 * - parent_task_id: Reference to parent task if this was spawned via deterministic rehabilitation
 * - rehab_status: Rehabilitation lifecycle state (NONE, PENDING_REHAB, REHABILITATED, DECOMPOSED)
 */
export const migration016: Migration = {
  id: "016_task_commit_tracking_and_rehab",
  name: "Add commit attribution, failure reason, and task rehabilitation tracking to tasks table",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execRaw(`
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS commit_hash TEXT DEFAULT NULL;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS base_commit_hash TEXT DEFAULT NULL;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS failure_reason TEXT DEFAULT NULL;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id TEXT DEFAULT NULL;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rehab_status VARCHAR(50) DEFAULT 'NONE';
        CREATE INDEX IF NOT EXISTS idx_tasks_commit_hash ON tasks(commit_hash);
        CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
      `);
    } else {
      const columnsToAdd = [
        { name: "commit_hash", type: "TEXT DEFAULT NULL" },
        { name: "base_commit_hash", type: "TEXT DEFAULT NULL" },
        { name: "failure_reason", type: "TEXT DEFAULT NULL" },
        { name: "parent_task_id", type: "TEXT DEFAULT NULL" },
        { name: "rehab_status", type: "TEXT DEFAULT 'NONE'" }
      ];

      for (const col of columnsToAdd) {
        try {
          await driver.execRaw(`ALTER TABLE tasks ADD COLUMN ${col.name} ${col.type};`);
        } catch (err: unknown) {
          const msg = String(err);
          if (!msg.includes("duplicate column")) {
            throw err;
          }
        }
      }

      try {
        await driver.execRaw(`CREATE INDEX IF NOT EXISTS idx_tasks_commit_hash ON tasks(commit_hash);`);
        await driver.execRaw(`CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);`);
      } catch {
        // non-fatal index creation in SQLite
      }
    }
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execRaw(`
        DROP INDEX IF EXISTS idx_tasks_parent_task_id;
        DROP INDEX IF EXISTS idx_tasks_commit_hash;
        ALTER TABLE tasks DROP COLUMN IF EXISTS rehab_status;
        ALTER TABLE tasks DROP COLUMN IF EXISTS parent_task_id;
        ALTER TABLE tasks DROP COLUMN IF EXISTS failure_reason;
        ALTER TABLE tasks DROP COLUMN IF EXISTS base_commit_hash;
        ALTER TABLE tasks DROP COLUMN IF EXISTS commit_hash;
      `);
    } else {
      const cols = ["rehab_status", "parent_task_id", "failure_reason", "base_commit_hash", "commit_hash"];
      for (const col of cols) {
        try {
          await driver.execRaw(`ALTER TABLE tasks DROP COLUMN ${col};`);
        } catch {
          // In older SQLite versions DROP COLUMN might not be supported
        }
      }
    }
  }
};
