import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 003: LSP Diagnostics Snapshots Schema
 *
 * Persists compiler and type diagnostic snapshots for workspace health tracking
 * and self-healing LLM feedback loops.
 */
export const migration003: Migration = {
  id: "003_lsp_diagnostics",
  name: "Create lsp_diagnostic_snapshots relational table",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS lsp_diagnostic_snapshots (
        id VARCHAR(100) PRIMARY KEY,
        task_id VARCHAR(100),
        uri VARCHAR(500) NOT NULL,
        line INTEGER NOT NULL,
        character INTEGER NOT NULL,
        severity VARCHAR(50) NOT NULL,
        code VARCHAR(100),
        source VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_lsp_diag_task ON lsp_diagnostic_snapshots(task_id);
      CREATE INDEX IF NOT EXISTS idx_lsp_diag_uri ON lsp_diagnostic_snapshots(uri);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw("DROP TABLE IF EXISTS lsp_diagnostic_snapshots;");
  }
};
