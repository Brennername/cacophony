import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 019: Task Metadata Hints Schema
 *
 * Implements Phase 72 (T72.1.3):
 * - metadata_hints: JSON-serialized TaskMetadataHints containing granular execution directives
 *   such as model affinity overrides, temperature floats, token limits, rule bypass flags,
 *   target stack profiles, and execution guardrails.
 */
export const migration019: Migration = {
  id: "019_task_metadata_hints",
  name: "Add metadata_hints JSON column to tasks table",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execRaw(`
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata_hints TEXT DEFAULT NULL;
      `);
    } else {
      try {
        await driver.execRaw(
          `ALTER TABLE tasks ADD COLUMN metadata_hints TEXT DEFAULT NULL;`,
        );
      } catch (err: unknown) {
        const msg = String(err);
        if (!msg.includes("duplicate column")) {
          throw err;
        }
      }
    }
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execRaw(`
        ALTER TABLE tasks DROP COLUMN IF EXISTS metadata_hints;
      `);
    } else {
      // SQLite does not support dropping columns in legacy versions without table recreation.
      // Leaving column unused on down migration for SQLite.
    }
  },
};
