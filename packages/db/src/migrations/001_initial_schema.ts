import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { Migration } from "./MigrationRunner.js";

/**
 * Migration 001: Initial Core Schema
 *
 * Establishes the foundational relational schema for Cacophony, including:
 * - tasks and task_stages
 * - model_health_profiles and telemetry_snapshots
 * - pr_reviews and tool_audit_logs
 * - secret_vault
 */
export const migration001: Migration = {
  id: "001_initial_schema",
  name: "Create foundational relational schema for tasks, stages, metrics, and vault",

  async up(driver: IDatabaseDriver): Promise<void> {
    const isPostgres = driver.getDialect() === "postgres";
    const serialType = isPostgres ? "BIGSERIAL" : "INTEGER";
    const autoIncrement = isPostgres ? "" : "PRIMARY KEY AUTOINCREMENT";
    const primaryKeyForSerial = isPostgres ? "PRIMARY KEY" : "";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";
    const floatType = isPostgres ? "DOUBLE PRECISION" : "REAL";
    const bigintType = isPostgres ? "BIGINT" : "INTEGER";

    // 1. Tasks Table
    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        prompt TEXT NOT NULL,
        role VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(10) NOT NULL,
        model_assigned VARCHAR(100),
        test_command TEXT,
        focus_files TEXT,
        target_branch VARCHAR(255),
        pr_url TEXT,
        failure_count INTEGER NOT NULL DEFAULT 0,
        created_at ${timestampType} NOT NULL,
        updated_at ${timestampType} NOT NULL,
        completed_at ${timestampType}
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    `);

    // 2. Task Stages Table
    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS task_stages (
        id ${serialType} ${autoIncrement} ${primaryKeyForSerial},
        task_id VARCHAR(100) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        stage_name VARCHAR(50) NOT NULL,
        stage_status VARCHAR(50) NOT NULL,
        log_output TEXT,
        tokens_sent INTEGER NOT NULL DEFAULT 0,
        tokens_received INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        started_at ${timestampType} NOT NULL,
        completed_at ${timestampType}
      );
      CREATE INDEX IF NOT EXISTS idx_task_stages_task_id ON task_stages(task_id);
    `);

    // 3. Model Health Profiles Table
    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS model_health_profiles (
        model_id VARCHAR(100) PRIMARY KEY,
        provider VARCHAR(50) NOT NULL,
        total_tasks INTEGER NOT NULL DEFAULT 0,
        total_success INTEGER NOT NULL DEFAULT 0,
        total_failures INTEGER NOT NULL DEFAULT 0,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        avg_latency_ms ${floatType} NOT NULL DEFAULT 0.0,
        avg_tokens_per_sec ${floatType} NOT NULL DEFAULT 0.0,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        last_used_at ${timestampType}
      );
    `);

    // 4. Telemetry Snapshots Table
    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS telemetry_snapshots (
        timestamp ${timestampType} PRIMARY KEY,
        gpu_busy_pct ${floatType} NOT NULL DEFAULT 0.0,
        vram_used_bytes ${bigintType} NOT NULL DEFAULT 0,
        vram_total_bytes ${bigintType} NOT NULL DEFAULT 0,
        gtt_used_bytes ${bigintType} NOT NULL DEFAULT 0,
        gtt_total_bytes ${bigintType} NOT NULL DEFAULT 0,
        edge_temp_c ${floatType} NOT NULL DEFAULT 0.0,
        vddgfx_mv ${floatType} NOT NULL DEFAULT 0.0,
        soc_mv ${floatType} NOT NULL DEFAULT 0.0,
        ppt_watts ${floatType} NOT NULL DEFAULT 0.0,
        sclk_mhz ${floatType} NOT NULL DEFAULT 0.0,
        current_model VARCHAR(100)
      );
    `);

    // 5. PR Reviews Table
    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS pr_reviews (
        id ${serialType} ${autoIncrement} ${primaryKeyForSerial},
        task_id VARCHAR(100) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        gitea_pr_id INTEGER NOT NULL,
        reviewer_model VARCHAR(100) NOT NULL,
        verdict VARCHAR(50) NOT NULL,
        review_notes TEXT NOT NULL,
        diff_analyzed TEXT NOT NULL,
        created_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pr_reviews_task_id ON pr_reviews(task_id);
    `);

    // 6. Tool Audit Logs Table
    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS tool_audit_logs (
        id ${serialType} ${autoIncrement} ${primaryKeyForSerial},
        task_id VARCHAR(100),
        tool_name VARCHAR(100) NOT NULL,
        parameters_json TEXT NOT NULL,
        result_summary TEXT NOT NULL,
        execution_time_ms INTEGER NOT NULL DEFAULT 0,
        created_at ${timestampType} NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tool_audit_task_id ON tool_audit_logs(task_id);
    `);

    // 7. Secret Vault Table
    await driver.execRaw(`
      CREATE TABLE IF NOT EXISTS secret_vault (
        id VARCHAR(100) PRIMARY KEY,
        secret_key VARCHAR(255) NOT NULL UNIQUE,
        encrypted_value TEXT NOT NULL,
        iv VARCHAR(100) NOT NULL,
        created_at ${timestampType} NOT NULL,
        updated_at ${timestampType} NOT NULL
      );
    `);
  }
};
