import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 018: Task History, Stage Spans, and Model Health Composite Indexes
 *
 * Implements Phase 66 (T66.1.1, T66.1.2, T66.1.3):
 * - idx_tasks_status_updated: composite index on tasks(status, updated_at DESC) for fast history pagination
 * - idx_stages_task_started: composite index on task_stages(task_id, stage_name, started_at DESC) for stage timeline lookups
 * - idx_model_health_status: composite index on model_health_profiles(model_id, status) for rapid scheduler health evaluation
 */
export const migration018: Migration = {
  id: "018_task_history_indexes",
  name: "Add composite indexes for tasks, task_stages, and model_health_profiles",

  async up(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status_updated ON tasks(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_stages_task_started ON task_stages(task_id, stage_name, started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_model_health_status ON model_health_profiles(model_id, status);
    `);
  },

  async down(driver: IDatabaseDriver): Promise<void> {
    await driver.execRaw(`
      DROP INDEX IF EXISTS idx_tasks_status_updated;
      DROP INDEX IF EXISTS idx_stages_task_started;
      DROP INDEX IF EXISTS idx_model_health_status;
    `);
  },
};
