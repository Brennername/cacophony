import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 009: Enterprise SSO User Sessions
 *
 * Implements persistent storage for SSO user sessions, encrypted access/refresh tokens,
 * provider tracking, and expiration lifecycle.
 */
export const migration009: Migration = {
  id: "009_user_sessions",
  name: "Create user_sessions table for enterprise SSO token persistence",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        username VARCHAR(128) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'VIEWER',
        provider VARCHAR(64) NOT NULL,
        access_token_enc TEXT NOT NULL,
        refresh_token_enc TEXT,
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} NOT NULL,
        updated_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP TABLE IF EXISTS user_sessions;
    `);
  }
};
