import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 010: Task Telemetry Correlations
 *
 * Links task runs to GPU telemetry metrics (avgGpuBusy, peakEdgeTemp, totalTokens,
 * avgTokensPerSec, and thermal throttle events) for model efficiency scoring.
 */
export const migration010: Migration = {
  id: "010_task_telemetry_correlations",
  name: "Create task_telemetry_correlations table for model thermal and token efficiency",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS task_telemetry_correlations (
        id VARCHAR(100) PRIMARY KEY,
        task_id VARCHAR(100) NOT NULL,
        model_id VARCHAR(100) NOT NULL,
        avg_gpu_busy REAL NOT NULL DEFAULT 0.0,
        peak_edge_temp REAL NOT NULL DEFAULT 0.0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        avg_tokens_per_sec REAL NOT NULL DEFAULT 0.0,
        thermal_throttle_events INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_correlations_task ON task_telemetry_correlations(task_id);
      CREATE INDEX IF NOT EXISTS idx_correlations_model ON task_telemetry_correlations(model_id);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP TABLE IF EXISTS task_telemetry_correlations;
    `);
  }
};
