import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 006: Repository Symbol Graph and Ranked Code Index
 *
 * Persists AST extracted symbols, cross-file references, and PageRank architectural scores
 * to enable fast token-budgeted repo-map generation and query-focused biasing.
 */
export const migration006: Migration = {
  id: "006_repository_symbol_graph",
  name: "Create repository_symbol_graph table for PageRank code indexing",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS repository_symbol_graph (
        id VARCHAR(100) PRIMARY KEY,
        workspace_root VARCHAR(500) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        symbol_name VARCHAR(255) NOT NULL,
        symbol_kind VARCHAR(50) NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        signature TEXT NOT NULL,
        pagerank_score REAL NOT NULL DEFAULT 0.0,
        incoming_refs_count INTEGER NOT NULL DEFAULT 0,
        file_mtime BIGINT NOT NULL DEFAULT 0,
        updated_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_repo_symbol_workspace_file ON repository_symbol_graph(workspace_root, file_path);
      CREATE INDEX IF NOT EXISTS idx_repo_symbol_name ON repository_symbol_graph(symbol_name);
      CREATE INDEX IF NOT EXISTS idx_repo_symbol_score ON repository_symbol_graph(pagerank_score DESC);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP TABLE IF EXISTS repository_symbol_graph;
    `);
  }
};
