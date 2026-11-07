import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 024: Function Doc Comment Candidates & Selection States
 *
 * Persists synthesized JSDoc / TSDoc comment candidates, user revision guidance,
 * selection lifecycle states (PENDING, ACCEPTED, DISCARDED), and pruning timestamps.
 */
export const migration024: Migration = {
  id: "024_create_doc_comment_candidates",
  name: "Create doc_comment_candidates table for interactive comment synthesis and reroll history",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS doc_comment_candidates (
        id VARCHAR(128) PRIMARY KEY,
        function_identifier VARCHAR(256) NOT NULL,
        file_path TEXT NOT NULL,
        candidate_text TEXT NOT NULL,
        user_guidance TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        model_id VARCHAR(128) NOT NULL,
        created_at ${timestampType} NOT NULL,
        accepted_at ${timestampType},
        discarded_at ${timestampType}
      );
      CREATE INDEX IF NOT EXISTS idx_doc_candidates_fn ON doc_comment_candidates(file_path, function_identifier);
      CREATE INDEX IF NOT EXISTS idx_doc_candidates_status ON doc_comment_candidates(status);
      CREATE INDEX IF NOT EXISTS idx_doc_candidates_created_at ON doc_comment_candidates(created_at);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP TABLE IF EXISTS doc_comment_candidates;
    `);
  },
};
