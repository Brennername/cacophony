import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 012: Task Runtime Metrics
 *
 * Adds duration_ms and tokens_per_sec columns to the tasks table so that
 * per-task execution duration and measured inference velocity can be persisted
 * and surfaced in the history view and model leaderboard comparisons.
 *
 * Both columns default to zero so existing rows are valid without backfill.
 */
export const migration012: Migration = {
  id: "012_task_runtime_metrics",
  name: "Add duration_ms and tokens_per_sec columns to tasks table for runtime efficiency tracking",
  up: async (driver: IDatabaseDriver): Promise<void> => {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execute(
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration_ms INTEGER DEFAULT 0"
      );
      await driver.execute(
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tokens_per_sec REAL DEFAULT 0.0"
      );
    } else {
      // SQLite syntax: ALTER TABLE ... ADD COLUMN ... (without IF NOT EXISTS)
      try {
        await driver.execute(
          "ALTER TABLE tasks ADD COLUMN duration_ms INTEGER DEFAULT 0"
        );
      } catch (err: unknown) {
        const msg = String(err);
        if (!msg.includes("duplicate column")) {
          throw err;
        }
      }
      try {
        await driver.execute(
          "ALTER TABLE tasks ADD COLUMN tokens_per_sec REAL DEFAULT 0.0"
        );
      } catch (err: unknown) {
        const msg = String(err);
        if (!msg.includes("duplicate column")) {
          throw err;
        }
      }
    }
  },
  down: async (driver: IDatabaseDriver): Promise<void> => {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS duration_ms");
      await driver.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS tokens_per_sec");
    } else {
      try {
        await driver.execute("ALTER TABLE tasks DROP COLUMN duration_ms");
      } catch {
        // ignore if not supported
      }
      try {
        await driver.execute("ALTER TABLE tasks DROP COLUMN tokens_per_sec");
      } catch {
        // ignore if not supported
      }
    }
  }
};
