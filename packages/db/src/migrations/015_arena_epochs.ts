import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

export const migration015: Migration = {
  id: "015_arena_epochs",
  name: "Create arena_epochs and model_health_epoch_history tables for statistical epoching",
  up: async (driver: IDatabaseDriver): Promise<void> => {
    const isPostgres = driver.getDialect() === "postgres";

    if (isPostgres) {
      await driver.execute(`
        CREATE TABLE IF NOT EXISTS arena_epochs (
          epoch_id SERIAL PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          reason TEXT NOT NULL,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ended_at TIMESTAMPTZ,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          task_count INTEGER NOT NULL DEFAULT 0,
          success_count INTEGER NOT NULL DEFAULT 0,
          failure_count INTEGER NOT NULL DEFAULT 0,
          notes TEXT
        )
      `);

      await driver.execute(`
        CREATE TABLE IF NOT EXISTS model_health_epoch_history (
          id SERIAL PRIMARY KEY,
          epoch_id INTEGER NOT NULL REFERENCES arena_epochs(epoch_id) ON DELETE CASCADE,
          model_id VARCHAR(128) NOT NULL,
          provider VARCHAR(64) NOT NULL,
          total_tasks INTEGER NOT NULL DEFAULT 0,
          total_success INTEGER NOT NULL DEFAULT 0,
          total_failures INTEGER NOT NULL DEFAULT 0,
          consecutive_failures INTEGER NOT NULL DEFAULT 0,
          avg_latency_ms DOUBLE PRECISION NOT NULL DEFAULT 0.0,
          avg_tokens_per_sec DOUBLE PRECISION NOT NULL DEFAULT 0.0,
          status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
          snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await driver.execute(`
        CREATE INDEX IF NOT EXISTS idx_arena_epochs_active ON arena_epochs(is_active)
      `);
      await driver.execute(`
        CREATE INDEX IF NOT EXISTS idx_model_epoch_history_epoch ON model_health_epoch_history(epoch_id)
      `);

      await driver.execute(`
        INSERT INTO arena_epochs (name, reason, started_at, is_active, notes)
        SELECT 'Epoch 1: Arena Bootstrap & Early Operations', 'Initial self-hosting bootstrap epoch', NOW(), TRUE, 'Pre-failure cascade bootstrap trials'
        WHERE NOT EXISTS (SELECT 1 FROM arena_epochs)
      `);
    } else {
      await driver.execute(`
        CREATE TABLE IF NOT EXISTS arena_epochs (
          epoch_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          reason TEXT NOT NULL,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          task_count INTEGER NOT NULL DEFAULT 0,
          success_count INTEGER NOT NULL DEFAULT 0,
          failure_count INTEGER NOT NULL DEFAULT 0,
          notes TEXT
        );
      `);

      await driver.execute(`
        CREATE TABLE IF NOT EXISTS model_health_epoch_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          epoch_id INTEGER NOT NULL REFERENCES arena_epochs(epoch_id) ON DELETE CASCADE,
          model_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          total_tasks INTEGER NOT NULL DEFAULT 0,
          total_success INTEGER NOT NULL DEFAULT 0,
          total_failures INTEGER NOT NULL DEFAULT 0,
          consecutive_failures INTEGER NOT NULL DEFAULT 0,
          avg_latency_ms REAL NOT NULL DEFAULT 0.0,
          avg_tokens_per_sec REAL NOT NULL DEFAULT 0.0,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          snapshotted_at TEXT NOT NULL
        );
      `);

      await driver.execute(`
        CREATE INDEX IF NOT EXISTS idx_arena_epochs_active ON arena_epochs(is_active);
      `);
      await driver.execute(`
        CREATE INDEX IF NOT EXISTS idx_model_epoch_history_epoch ON model_health_epoch_history(epoch_id);
      `);

      const now = new Date().toISOString();
      await driver.execute(`
        INSERT INTO arena_epochs (name, reason, started_at, is_active, notes)
        SELECT 'Epoch 1: Arena Bootstrap & Early Operations', 'Initial self-hosting bootstrap epoch', '${now}', 1, 'Pre-failure cascade bootstrap trials'
        WHERE NOT EXISTS (SELECT 1 FROM arena_epochs);
      `);
    }
  },
  down: async (driver: IDatabaseDriver): Promise<void> => {
    await driver.execute("DROP TABLE IF EXISTS model_health_epoch_history");
    await driver.execute("DROP TABLE IF EXISTS arena_epochs");
  }
};
