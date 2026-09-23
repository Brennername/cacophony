import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { TaskStageRecord, StageName, StageStatus } from "@cacophony/shared-types";

interface StageRow {
  readonly id: number;
  readonly task_id: string;
  readonly stage_name: string;
  readonly stage_status: string;
  readonly log_output: string | null;
  readonly tokens_sent: number;
  readonly tokens_received: number;
  readonly duration_ms: number;
  readonly started_at: string;
  readonly completed_at: string | null;
}

/**
 * StageRepository
 *
 * Manages fine-grained execution steps within active tasks,
 * capturing stage duration, token accounting, and streaming logs.
 */
export class StageRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Records the start of a task stage and returns the stage record ID.
   */
  public async recordStageStart(taskId: string, stageName: StageName): Promise<number> {
    const startedAt = new Date().toISOString();
    if (this.driver.getDialect() === "postgres") {
      const row = await this.driver.queryOne<{ id: number }>(
        `INSERT INTO task_stages (
          task_id, stage_name, stage_status, started_at, tokens_sent, tokens_received, duration_ms
        ) VALUES ($1, $2, 'RUNNING', $3, 0, 0, 0) RETURNING id`,
        [taskId, stageName, startedAt]
      );
      return Number(row?.id);
    }

    // SQLite fallback
    await this.driver.execute(
      `INSERT INTO task_stages (
        task_id, stage_name, stage_status, started_at, tokens_sent, tokens_received, duration_ms
      ) VALUES ($1, $2, 'RUNNING', $3, 0, 0, 0)`,
      [taskId, stageName, startedAt]
    );
    const row = await this.driver.queryOne<{ id: number }>(
      "SELECT last_insert_rowid() AS id"
    );
    return Number(row?.id);
  }

  /**
   * Completes a task stage with final verdict, output logs, token statistics, and duration.
   */
  public async recordStageCompletion(
    id: number,
    status: StageStatus,
    logOutput: string,
    tokensSent: number,
    tokensReceived: number,
    durationMs: number
  ): Promise<void> {
    const completedAt = new Date().toISOString();
    await this.driver.execute(
      `UPDATE task_stages SET 
        stage_status = $1, log_output = $2, tokens_sent = $3,
        tokens_received = $4, duration_ms = $5, completed_at = $6
       WHERE id = $7`,
      [status, logOutput, tokensSent, tokensReceived, durationMs, completedAt, id]
    );
  }

  /**
   * Retrieves all stages for a task ordered chronologically.
   */
  public async getStagesForTask(taskId: string): Promise<readonly TaskStageRecord[]> {
    const rows = await this.driver.query<StageRow>(
      "SELECT * FROM task_stages WHERE task_id = $1 ORDER BY id ASC",
      [taskId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  private mapRow(row: StageRow): TaskStageRecord {
    return {
      id: Number(row.id),
      taskId: row.task_id,
      stageName: row.stage_name as StageName,
      stageStatus: row.stage_status as StageStatus,
      logOutput: row.log_output,
      tokensSent: Number(row.tokens_sent),
      tokensReceived: Number(row.tokens_received),
      durationMs: Number(row.duration_ms),
      startedAt: String(row.started_at),
      completedAt: row.completed_at ? String(row.completed_at) : null
    };
  }
}
