import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 017: Remediation Telemetry Tracking
 *
 * Adds columns to track:
 * - total_remediation_attempts: Number of automated remediation loops triggered per model
 * - total_remediation_success: Number of automated remediations that succeeded and restored passing status
 *
 * Applied to:
 * - model_health_profiles
 * - model_health_epoch_history
 */
export const migration017: Migration = {
  id: "017_remediation_telemetry",
  name: "Add total_remediation_attempts and total_remediation_success to model health tracking",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execRaw(`
        ALTER TABLE model_health_profiles ADD COLUMN IF NOT EXISTS total_remediation_attempts INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE model_health_profiles ADD COLUMN IF NOT EXISTS total_remediation_success INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE model_health_epoch_history ADD COLUMN IF NOT EXISTS total_remediation_attempts INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE model_health_epoch_history ADD COLUMN IF NOT EXISTS total_remediation_success INTEGER NOT NULL DEFAULT 0;
      `);
    } else {
      const tables = ["model_health_profiles", "model_health_epoch_history"];
      const columns = [
        {
          name: "total_remediation_attempts",
          type: "INTEGER NOT NULL DEFAULT 0",
        },
        {
          name: "total_remediation_success",
          type: "INTEGER NOT NULL DEFAULT 0",
        },
      ];

      for (const table of tables) {
        for (const col of columns) {
          try {
            await driver.execRaw(
              `ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type};`,
            );
          } catch (err: unknown) {
            const msg = String(err);
            if (!msg.includes("duplicate column")) {
              throw err;
            }
          }
        }
      }
    }
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execRaw(`
        ALTER TABLE model_health_profiles DROP COLUMN IF EXISTS total_remediation_success;
        ALTER TABLE model_health_profiles DROP COLUMN IF EXISTS total_remediation_attempts;
        ALTER TABLE model_health_epoch_history DROP COLUMN IF EXISTS total_remediation_success;
        ALTER TABLE model_health_epoch_history DROP COLUMN IF EXISTS total_remediation_attempts;
      `);
    } else {
      const tables = ["model_health_profiles", "model_health_epoch_history"];
      const cols = ["total_remediation_success", "total_remediation_attempts"];
      for (const table of tables) {
        for (const col of cols) {
          try {
            await driver.execRaw(`ALTER TABLE ${table} DROP COLUMN ${col};`);
          } catch {
            // Older SQLite versions may not support DROP COLUMN
          }
        }
      }
    }
  },
};
