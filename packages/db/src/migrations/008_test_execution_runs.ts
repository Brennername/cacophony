import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 008: Automated Test Execution Runs
 *
 * Persists results of automated post-edit test execution cycles,
 * capturing exit codes, durations, parsed assertion diffs, and root causes for closed-loop remediation.
 */
export const migration008: Migration = {
  id: "008_test_execution_runs",
  name: "Create test_execution_runs table for test runner and remediation tracking",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS test_execution_runs (
        id VARCHAR(100) PRIMARY KEY,
        task_id VARCHAR(100),
        session_id VARCHAR(100),
        test_framework VARCHAR(50) NOT NULL,
        test_command TEXT NOT NULL,
        scoped_files_json TEXT NOT NULL DEFAULT '[]',
        exit_code INTEGER NOT NULL,
        passed BOOLEAN NOT NULL,
        duration_ms INTEGER NOT NULL,
        stdout TEXT NOT NULL,
        stderr TEXT NOT NULL,
        failed_assertions_json TEXT NOT NULL DEFAULT '[]',
        root_causes_json TEXT NOT NULL DEFAULT '[]',
        remediation_attempt INTEGER NOT NULL DEFAULT 1,
        created_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_test_runs_task ON test_execution_runs(task_id);
      CREATE INDEX IF NOT EXISTS idx_test_runs_session ON test_execution_runs(session_id);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP TABLE IF EXISTS test_execution_runs;
    `);
  }
};
