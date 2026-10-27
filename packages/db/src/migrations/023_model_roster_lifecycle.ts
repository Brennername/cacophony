import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 023: Dynamic Model Roster and Bullpen Lifecycle
 *
 * Provides persistent, configurable storage for models assigned to the active Roster,
 * evaluation Bullpen, and specialized Boutique pools, eliminating hardcoded model sets.
 */
export const migration023: Migration = {
  id: "023_model_roster_lifecycle",
  name: "Create model_roster_entries table for dynamic roster and bullpen lifecycle management",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";
    const booleanType = isPostgres ? "BOOLEAN" : "INTEGER";
    const defaultTrue = isPostgres ? "TRUE" : "1";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS model_roster_entries (
        id VARCHAR(128) PRIMARY KEY,
        model_id VARCHAR(128) NOT NULL UNIQUE,
        tier VARCHAR(32) NOT NULL DEFAULT 'ROSTER',
        roles_json TEXT NOT NULL DEFAULT '[]',
        concurrency_limit INTEGER NOT NULL DEFAULT 1,
        is_active ${booleanType} NOT NULL DEFAULT ${defaultTrue},
        is_protected ${booleanType} NOT NULL DEFAULT ${defaultTrue},
        eval_task_count INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at ${timestampType} NOT NULL,
        updated_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_model_roster_model_id ON model_roster_entries(model_id);
      CREATE INDEX IF NOT EXISTS idx_model_roster_tier ON model_roster_entries(tier);
      CREATE INDEX IF NOT EXISTS idx_model_roster_is_active ON model_roster_entries(is_active);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP TABLE IF EXISTS model_roster_entries;
    `);
  },
};
