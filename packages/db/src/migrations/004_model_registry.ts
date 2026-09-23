import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 004: Model Registry Schema
 *
 * Persists registered AI models, capabilities, token limits, and pricing metadata.
 */
export const migration004: Migration = {
  id: "004_model_registry",
  name: "Create model_registry_entries relational table",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS model_registry_entries (
        model_id VARCHAR(100) PRIMARY KEY,
        family VARCHAR(50) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        context_window_size INTEGER NOT NULL,
        max_output_tokens INTEGER NOT NULL,
        tool_calling BOOLEAN NOT NULL DEFAULT false,
        diff_format BOOLEAN NOT NULL DEFAULT false,
        cost_per_1k_tokens REAL NOT NULL DEFAULT 0,
        is_local BOOLEAN NOT NULL DEFAULT true,
        tags_json TEXT NOT NULL DEFAULT '[]',
        created_at ${timestampType} NOT NULL,
        updated_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_model_registry_provider ON model_registry_entries(provider);
      CREATE INDEX IF NOT EXISTS idx_model_registry_is_local ON model_registry_entries(is_local);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw("DROP TABLE IF EXISTS model_registry_entries;");
  }
};
