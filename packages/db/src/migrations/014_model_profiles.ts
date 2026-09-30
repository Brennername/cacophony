import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 014: Model Tuning Profiles
 *
 * Creates the model_tuning_profiles table to persist whitebox per-model tuning parameters
 * (num_predict, num_ctx, temperature, top_k, top_p, repeat_penalty, auto_tuned, is_active).
 */
export const migration014: Migration = {
  id: "014_model_profiles",
  name: "Create model_tuning_profiles table for whitebox model profile tuning and auto-optimization",
  up: async (driver: IDatabaseDriver): Promise<void> => {
    const isPostgres = driver.getDialect() === "postgres";
    if (isPostgres) {
      await driver.execute(`
        CREATE TABLE IF NOT EXISTS model_tuning_profiles (
          id VARCHAR(64) PRIMARY KEY,
          model_name VARCHAR(128) NOT NULL,
          role VARCHAR(64) NOT NULL DEFAULT 'implementer',
          num_predict INTEGER NOT NULL DEFAULT 8192,
          num_ctx INTEGER NOT NULL DEFAULT 16384,
          temperature DOUBLE PRECISION NOT NULL DEFAULT 0.1,
          top_k INTEGER NOT NULL DEFAULT 40,
          top_p DOUBLE PRECISION NOT NULL DEFAULT 0.9,
          repeat_penalty DOUBLE PRECISION NOT NULL DEFAULT 1.1,
          auto_tuned BOOLEAN NOT NULL DEFAULT FALSE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await driver.execute(`
        CREATE INDEX IF NOT EXISTS idx_model_tuning_profiles_name ON model_tuning_profiles(model_name)
      `);
      await driver.execute(`
        CREATE INDEX IF NOT EXISTS idx_model_tuning_profiles_role ON model_tuning_profiles(role)
      `);
    } else {
      await driver.execute(`
        CREATE TABLE IF NOT EXISTS model_tuning_profiles (
          id TEXT PRIMARY KEY,
          model_name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'implementer',
          num_predict INTEGER NOT NULL DEFAULT 8192,
          num_ctx INTEGER NOT NULL DEFAULT 16384,
          temperature REAL NOT NULL DEFAULT 0.1,
          top_k INTEGER NOT NULL DEFAULT 40,
          top_p REAL NOT NULL DEFAULT 0.9,
          repeat_penalty REAL NOT NULL DEFAULT 1.1,
          auto_tuned INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await driver.execute(`
        CREATE INDEX IF NOT EXISTS idx_model_tuning_profiles_name ON model_tuning_profiles(model_name);
      `);
      await driver.execute(`
        CREATE INDEX IF NOT EXISTS idx_model_tuning_profiles_role ON model_tuning_profiles(role);
      `);
    }
  },
  down: async (driver: IDatabaseDriver): Promise<void> => {
    await driver.execute("DROP TABLE IF EXISTS model_tuning_profiles;");
  }
};
