import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 021: PR Discussion Threads & Multi-Model Advisory Comments Schema
 *
 * Implements Phase 108:
 * Stores threaded discussions, code reviews, and domain-specific advice
 * from specialist models (Security, Auth, UX/UI, Playwright E2E, Architecture)
 * and humans on Pull Requests.
 */
export const migration021: Migration = {
  id: "021_pr_discussion_threads",
  name: "Create pr_discussion_threads table for tracking multi-model PR discussions and advisory reviews",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execRaw(`
        CREATE TABLE IF NOT EXISTS pr_discussion_threads (
          id SERIAL PRIMARY KEY,
          task_id VARCHAR(128) NOT NULL,
          pr_index INTEGER NOT NULL,
          thread_id VARCHAR(128) NOT NULL,
          author_name VARCHAR(128) NOT NULL,
          author_role VARCHAR(64) NOT NULL DEFAULT 'model',
          domain_tag VARCHAR(64) NOT NULL DEFAULT 'General',
          file_path VARCHAR(512),
          line_number INTEGER,
          body_content TEXT NOT NULL,
          is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ
        );
      `);

      await driver.execRaw(`
        CREATE INDEX IF NOT EXISTS idx_pr_threads_task_id ON pr_discussion_threads(task_id);
        CREATE INDEX IF NOT EXISTS idx_pr_threads_pr_index ON pr_discussion_threads(pr_index);
        CREATE INDEX IF NOT EXISTS idx_pr_threads_thread_id ON pr_discussion_threads(thread_id);
        CREATE INDEX IF NOT EXISTS idx_pr_threads_domain ON pr_discussion_threads(domain_tag);
      `);
    } else {
      await driver.execRaw(`
        CREATE TABLE IF NOT EXISTS pr_discussion_threads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id TEXT NOT NULL,
          pr_index INTEGER NOT NULL,
          thread_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          author_role TEXT NOT NULL DEFAULT 'model',
          domain_tag TEXT NOT NULL DEFAULT 'General',
          file_path TEXT,
          line_number INTEGER,
          body_content TEXT NOT NULL,
          is_resolved INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT
        );
      `);

      await driver.execRaw(`
        CREATE INDEX IF NOT EXISTS idx_pr_threads_task_id ON pr_discussion_threads(task_id);
        CREATE INDEX IF NOT EXISTS idx_pr_threads_pr_index ON pr_discussion_threads(pr_index);
        CREATE INDEX IF NOT EXISTS idx_pr_threads_thread_id ON pr_discussion_threads(thread_id);
        CREATE INDEX IF NOT EXISTS idx_pr_threads_domain ON pr_discussion_threads(domain_tag);
      `);
    }
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`DROP TABLE IF EXISTS pr_discussion_threads;`);
  },
};
