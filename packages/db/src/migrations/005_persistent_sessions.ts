import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 005: Persistent Sessions and Auto-Compaction History Schema
 *
 * Implements persistent storage for multi-tab conversation sessions,
 * message histories, tab states, and auto-compaction checkpoints.
 */
export const migration005: Migration = {
  id: "005_persistent_sessions",
  name: "Create sessions, session_messages, session_tabs, and compaction_history tables",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        branch VARCHAR(255) NOT NULL DEFAULT 'master',
        active_model VARCHAR(100) NOT NULL,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at ${timestampType} NOT NULL,
        updated_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_branch ON sessions(branch);

      CREATE TABLE IF NOT EXISTS session_messages (
        id VARCHAR(100) PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        tool_calls_json TEXT DEFAULT '[]',
        tool_results_json TEXT DEFAULT '[]',
        token_count INTEGER NOT NULL DEFAULT 0,
        importance_score REAL NOT NULL DEFAULT 1.0,
        created_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_session_messages_session ON session_messages(session_id);

      CREATE TABLE IF NOT EXISTS session_tabs (
        id VARCHAR(100) PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        tab_name VARCHAR(100) NOT NULL,
        active_file VARCHAR(500),
        cursor_position INTEGER NOT NULL DEFAULT 0,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_session_tabs_session ON session_tabs(session_id);

      CREATE TABLE IF NOT EXISTS session_compaction_history (
        id VARCHAR(100) PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        pre_compaction_tokens INTEGER NOT NULL,
        post_compaction_tokens INTEGER NOT NULL,
        summary_text TEXT NOT NULL,
        preserved_turns_count INTEGER NOT NULL,
        created_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_compaction_session ON session_compaction_history(session_id);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP TABLE IF EXISTS session_compaction_history;
      DROP TABLE IF EXISTS session_tabs;
      DROP TABLE IF EXISTS session_messages;
      DROP TABLE IF EXISTS sessions;
    `);
  }
};
