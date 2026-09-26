import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 011: Add log_snippet column to tasks table
 *
 * Persists generated unified code diffs and diagnostic logs directly on tasks
 * so the Code Diffs tab in the frontend inspector can display actual changes.
 */
export const migration011: Migration = {
  id: "011_task_log_snippet",
  name: "Add log_snippet column to tasks table for unified code diffs and logs",

  async up(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS log_snippet TEXT;
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS log_snippet;
    `);
  }
};
