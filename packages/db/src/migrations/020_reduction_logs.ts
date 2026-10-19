import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 020: Reduction Logs & Statistical Profile Schema
 *
 * Implements Phase 104:
 * Records log profile reductions where bulky verbose raw logs (such as repeated test executions
 * and code generation dumps) are compressed down into statistical histograms.
 * Provides historical auditability, ticket reconstruction capabilities, and storage optimization metrics.
 */
export const migration020: Migration = {
  id: "020_reduction_logs",
  name: "Create reduction_logs table for tracking log reductions down to statistical histograms",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execRaw(`
        CREATE TABLE IF NOT EXISTS reduction_logs (
          id SERIAL PRIMARY KEY,
          task_id VARCHAR(128) NOT NULL,
          reduced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          stages_reduced INTEGER NOT NULL DEFAULT 0,
          original_bytes INTEGER NOT NULL DEFAULT 0,
          reduced_bytes INTEGER NOT NULL DEFAULT 0,
          reclaimed_bytes INTEGER NOT NULL DEFAULT 0,
          reduction_reason VARCHAR(255) NOT NULL,
          histogram_data TEXT NOT NULL
        );
      `);

      await driver.execRaw(`
        CREATE INDEX IF NOT EXISTS idx_reduction_logs_task_id ON reduction_logs(task_id);
        CREATE INDEX IF NOT EXISTS idx_reduction_logs_reduced_at ON reduction_logs(reduced_at);
      `);
    } else {
      await driver.execRaw(`
        CREATE TABLE IF NOT EXISTS reduction_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id TEXT NOT NULL,
          reduced_at TEXT NOT NULL,
          stages_reduced INTEGER NOT NULL DEFAULT 0,
          original_bytes INTEGER NOT NULL DEFAULT 0,
          reduced_bytes INTEGER NOT NULL DEFAULT 0,
          reclaimed_bytes INTEGER NOT NULL DEFAULT 0,
          reduction_reason TEXT NOT NULL,
          histogram_data TEXT NOT NULL
        );
      `);

      await driver.execRaw(`
        CREATE INDEX IF NOT EXISTS idx_reduction_logs_task_id ON reduction_logs(task_id);
        CREATE INDEX IF NOT EXISTS idx_reduction_logs_reduced_at ON reduction_logs(reduced_at);
      `);
    }
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`DROP TABLE IF EXISTS reduction_logs;`);
  },
};
