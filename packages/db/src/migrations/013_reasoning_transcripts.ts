import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 013: Reasoning Transcripts & Distilled Opinions
 *
 * Adds reasoning_transcript, distilled_opinion, and thinking_duration_ms columns
 * to the task_stages table so that full cognitive chains of thought and summarized
 * consensus opinions can be persisted and inspected across task runs.
 */
export const migration013: Migration = {
  id: "013_reasoning_transcripts",
  name: "Add reasoning_transcript, distilled_opinion, and thinking_duration_ms columns to task_stages table",
  up: async (driver: IDatabaseDriver): Promise<void> => {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execute(
        "ALTER TABLE task_stages ADD COLUMN IF NOT EXISTS reasoning_transcript TEXT"
      );
      await driver.execute(
        "ALTER TABLE task_stages ADD COLUMN IF NOT EXISTS distilled_opinion TEXT"
      );
      await driver.execute(
        "ALTER TABLE task_stages ADD COLUMN IF NOT EXISTS thinking_duration_ms INTEGER DEFAULT 0"
      );
    } else {
      // SQLite syntax: ALTER TABLE ... ADD COLUMN ...
      try {
        await driver.execute(
          "ALTER TABLE task_stages ADD COLUMN reasoning_transcript TEXT"
        );
      } catch (err: unknown) {
        const msg = String(err);
        if (!msg.includes("duplicate column")) {
          throw err;
        }
      }
      try {
        await driver.execute(
          "ALTER TABLE task_stages ADD COLUMN distilled_opinion TEXT"
        );
      } catch (err: unknown) {
        const msg = String(err);
        if (!msg.includes("duplicate column")) {
          throw err;
        }
      }
      try {
        await driver.execute(
          "ALTER TABLE task_stages ADD COLUMN thinking_duration_ms INTEGER DEFAULT 0"
        );
      } catch (err: unknown) {
        const msg = String(err);
        if (!msg.includes("duplicate column")) {
          throw err;
        }
      }
    }
  },
  down: async (driver: IDatabaseDriver): Promise<void> => {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execute("ALTER TABLE task_stages DROP COLUMN IF EXISTS reasoning_transcript");
      await driver.execute("ALTER TABLE task_stages DROP COLUMN IF EXISTS distilled_opinion");
      await driver.execute("ALTER TABLE task_stages DROP COLUMN IF EXISTS thinking_duration_ms");
    } else {
      try {
        await driver.execute("ALTER TABLE task_stages DROP COLUMN reasoning_transcript");
      } catch {
        // ignore if not supported in sqlite
      }
      try {
        await driver.execute("ALTER TABLE task_stages DROP COLUMN distilled_opinion");
      } catch {
        // ignore if not supported in sqlite
      }
      try {
        await driver.execute("ALTER TABLE task_stages DROP COLUMN thinking_duration_ms");
      } catch {
        // ignore if not supported in sqlite
      }
    }
  }
};
