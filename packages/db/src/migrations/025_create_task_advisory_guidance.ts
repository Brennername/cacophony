import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 025: Task Queue Advisory Guidance
 *
 * Persists operator feedback, recommendations, constraints, and instructions
 * on queued tasks for reviewer compliance auditing and advisory pausing.
 */
export const migration025: Migration = {
  id: "025_create_task_advisory_guidance",
  name: "Create task_advisory_guidance table for operator queue instructions and compliance audits",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS task_advisory_guidance (
        id VARCHAR(128) PRIMARY KEY,
        task_id VARCHAR(128) NOT NULL,
        author VARCHAR(128) NOT NULL,
        comment_text TEXT NOT NULL,
        advisory_type VARCHAR(32) NOT NULL DEFAULT 'INSTRUCTION',
        requires_compliance_audit BOOLEAN NOT NULL DEFAULT TRUE,
        created_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_task_advisory_task_id ON task_advisory_guidance(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_advisory_created_at ON task_advisory_guidance(created_at);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP TABLE IF EXISTS task_advisory_guidance;
    `);
  },
};
