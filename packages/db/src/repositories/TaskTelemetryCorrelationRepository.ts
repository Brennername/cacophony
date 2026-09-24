import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

export interface TaskTelemetryCorrelationRecord {
  readonly id: string;
  readonly taskId: string;
  readonly modelId: string;
  readonly avgGpuBusy: number;
  readonly peakEdgeTemp: number;
  readonly totalTokens: number;
  readonly avgTokensPerSec: number;
  readonly thermalThrottleEvents: number;
  readonly durationMs: number;
  readonly createdAt: string;
}

interface CorrelationRow {
  readonly id: string;
  readonly task_id: string;
  readonly model_id: string;
  readonly avg_gpu_busy: number;
  readonly peak_edge_temp: number;
  readonly total_tokens: number;
  readonly avg_tokens_per_sec: number;
  readonly thermal_throttle_events: number;
  readonly duration_ms: number;
  readonly created_at: string;
}

/**
 * Repository to persist and aggregate task execution telemetry correlations.
 */
export class TaskTelemetryCorrelationRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  public async recordCorrelation(record: TaskTelemetryCorrelationRecord): Promise<void> {
    await this.driver.execute(
      `INSERT INTO task_telemetry_correlations (
        id, task_id, model_id, avg_gpu_busy, peak_edge_temp,
        total_tokens, avg_tokens_per_sec, thermal_throttle_events, duration_ms, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        record.id,
        record.taskId,
        record.modelId,
        record.avgGpuBusy,
        record.peakEdgeTemp,
        record.totalTokens,
        record.avgTokensPerSec,
        record.thermalThrottleEvents,
        record.durationMs,
        record.createdAt
      ]
    );
  }

  public async getCorrelationsForModel(modelId: string): Promise<readonly TaskTelemetryCorrelationRecord[]> {
    const rows = await this.driver.query<CorrelationRow>(
      "SELECT * FROM task_telemetry_correlations WHERE model_id = $1 ORDER BY created_at DESC",
      [modelId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  public async getModelEfficiencySummary(): Promise<readonly {
    readonly modelId: string;
    readonly totalRuns: number;
    readonly avgTokensPerSec: number;
    readonly avgPeakTemp: number;
    readonly throttleEventCount: number;
  }[]> {
    const rows = await this.driver.query<{
      readonly model_id: string;
      readonly total_runs: number | string;
      readonly avg_tps: number | string;
      readonly avg_temp: number | string;
      readonly total_throttles: number | string;
    }>(
      `SELECT
        model_id,
        COUNT(*) as total_runs,
        COALESCE(AVG(avg_tokens_per_sec), 0) as avg_tps,
        COALESCE(AVG(peak_edge_temp), 0) as avg_temp,
        COALESCE(SUM(thermal_throttle_events), 0) as total_throttles
      FROM task_telemetry_correlations
      GROUP BY model_id`
    );

    return rows.map((r) => ({
      modelId: r.model_id,
      totalRuns: Number(r.total_runs),
      avgTokensPerSec: Number(Number(r.avg_tps).toFixed(1)),
      avgPeakTemp: Number(Number(r.avg_temp).toFixed(1)),
      throttleEventCount: Number(r.total_throttles)
    }));
  }

  private mapRow(row: CorrelationRow): TaskTelemetryCorrelationRecord {
    return {
      id: row.id,
      taskId: row.task_id,
      modelId: row.model_id,
      avgGpuBusy: Number(row.avg_gpu_busy),
      peakEdgeTemp: Number(row.peak_edge_temp),
      totalTokens: Number(row.total_tokens),
      avgTokensPerSec: Number(row.avg_tokens_per_sec),
      thermalThrottleEvents: Number(row.thermal_throttle_events),
      durationMs: Number(row.duration_ms),
      createdAt: String(row.created_at)
    };
  }
}
