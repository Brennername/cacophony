import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 022: Human-in-the-Loop (HITL) Contributor Tickets
 *
 * Provides persistent tracking for external GitHub issues, contributor ticket status,
 * prompt slipstream sanitization artifacts, and admin approval workflows.
 */
export const migration022: Migration = {
  id: "022_hitl_tickets",
  name: "Create hitl_tickets table for human-in-the-loop issue ingestion and gateway",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS hitl_tickets (
        id VARCHAR(128) PRIMARY KEY,
        github_issue_number INTEGER NOT NULL,
        github_issue_id BIGINT NOT NULL,
        github_issue_url TEXT NOT NULL,
        author VARCHAR(128) NOT NULL,
        author_avatar_url TEXT,
        title TEXT NOT NULL,
        raw_body TEXT NOT NULL,
        sanitized_prompt TEXT,
        target_branch VARCHAR(128) NOT NULL DEFAULT 'main',
        labels_json TEXT NOT NULL DEFAULT '[]',
        status VARCHAR(32) NOT NULL DEFAULT 'HITL_PENDING',
        priority VARCHAR(8) NOT NULL DEFAULT 'P1',
        associated_task_id VARCHAR(128),
        rejection_reason TEXT,
        pending_feedback_json TEXT NOT NULL DEFAULT '[]',
        created_at ${timestampType} NOT NULL,
        updated_at ${timestampType} NOT NULL,
        approved_at ${timestampType},
        approved_by VARCHAR(128)
      );
      CREATE INDEX IF NOT EXISTS idx_hitl_tickets_github_number ON hitl_tickets(github_issue_number);
      CREATE INDEX IF NOT EXISTS idx_hitl_tickets_author ON hitl_tickets(author);
      CREATE INDEX IF NOT EXISTS idx_hitl_tickets_status ON hitl_tickets(status);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP TABLE IF EXISTS hitl_tickets;
    `);
  },
};
