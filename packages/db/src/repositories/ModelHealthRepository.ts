import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { ModelHealthProfile, ModelStatus, InferenceProviderType, ArenaEpochRecord } from "@cacophony/shared-types";

interface ModelHealthRow {
  readonly model_id: string;
  readonly provider: string;
  readonly total_tasks: number;
  readonly total_success: number;
  readonly total_failures: number;
  readonly consecutive_failures: number;
  readonly avg_latency_ms: number;
  readonly avg_tokens_per_sec: number;
  readonly status: string;
  readonly last_used_at: string | null;
}

interface ArenaEpochRow {
  readonly epoch_id: number;
  readonly name: string;
  readonly reason: string;
  readonly started_at: string;
  readonly ended_at: string | null;
  readonly is_active: boolean | number;
  readonly task_count: number;
  readonly success_count: number;
  readonly failure_count: number;
  readonly notes: string | null;
}

/**
 * ModelHealthRepository
 *
 * Persists model execution telemetry, calculates rolling success rates,
 * and maintains consecutive failure counters for automated model eviction.
 */
export class ModelHealthRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Retrieves profile for a model or creates a default ACTIVE profile if none exists.
   */
  public async getProfile(modelId: string, provider: InferenceProviderType = "ollama"): Promise<ModelHealthProfile> {
    const existing = await this.driver.queryOne<ModelHealthRow>(
      "SELECT * FROM model_health_profiles WHERE model_id = $1",
      [modelId]
    );

    if (existing) {
      return this.mapRow(existing);
    }

    await this.driver.execute(
      `INSERT INTO model_health_profiles (
        model_id, provider, total_tasks, total_success, total_failures,
        consecutive_failures, avg_latency_ms, avg_tokens_per_sec, status, last_used_at
      ) VALUES ($1, $2, 0, 0, 0, 0, 0.0, 0.0, 'ACTIVE', NULL)
      ON CONFLICT (model_id) DO NOTHING`,
      [modelId, provider]
    );

    const created = await this.driver.queryOne<ModelHealthRow>(
      "SELECT * FROM model_health_profiles WHERE model_id = $1",
      [modelId]
    );
    return this.mapRow(created!);
  }

  /**
   * Records the outcome of an inference job, updates rolling averages,
   * and triggers automated eviction if consecutive failures reach 3 or more.
   */
  public async recordRun(
    modelId: string,
    provider: InferenceProviderType,
    success: boolean,
    latencyMs: number,
    tokensPerSec: number
  ): Promise<ModelHealthProfile> {
    const profile = await this.getProfile(modelId, provider);

    const totalTasks = profile.totalTasks + 1;
    const totalSuccess = profile.totalSuccess + (success ? 1 : 0);
    const totalFailures = profile.totalFailures + (success ? 0 : 1);
    const consecutiveFailures = success ? 0 : profile.consecutiveFailures + 1;

    // Moving average update
    const avgLatencyMs = profile.avgLatencyMs === 0
      ? latencyMs
      : Math.round((profile.avgLatencyMs * 0.8) + (latencyMs * 0.2));
    const avgTokensPerSec = profile.avgTokensPerSec === 0
      ? tokensPerSec
      : Number(((profile.avgTokensPerSec * 0.8) + (tokensPerSec * 0.2)).toFixed(2));

    // Automated eviction on 3 consecutive failures
    let status = profile.status;
    if (consecutiveFailures >= 3 && status === "ACTIVE") {
      status = "EJECTED";
    }

    const now = new Date().toISOString();

    await this.driver.execute(
      `UPDATE model_health_profiles SET 
        total_tasks = $1, total_success = $2, total_failures = $3,
        consecutive_failures = $4, avg_latency_ms = $5, avg_tokens_per_sec = $6,
        status = $7, last_used_at = $8
       WHERE model_id = $9`,
      [
        totalTasks,
        totalSuccess,
        totalFailures,
        consecutiveFailures,
        avgLatencyMs,
        avgTokensPerSec,
        status,
        now,
        modelId
      ]
    );

    return {
      modelId,
      provider,
      totalTasks,
      totalSuccess,
      totalFailures,
      consecutiveFailures,
      avgLatencyMs,
      avgTokensPerSec,
      status,
      lastUsedAt: now
    };
  }

  /**
   * Manually sets or resets model status (e.g. recovering an EJECTED model).
   */
  public async updateStatus(modelId: string, status: ModelStatus): Promise<void> {
    const resetFailures = status === "ACTIVE" ? 0 : undefined;
    if (resetFailures !== undefined) {
      await this.driver.execute(
        "UPDATE model_health_profiles SET status = $1, consecutive_failures = $2 WHERE model_id = $3",
        [status, resetFailures, modelId]
      );
    } else {
      await this.driver.execute(
        "UPDATE model_health_profiles SET status = $1 WHERE model_id = $2",
        [status, modelId]
      );
    }
  }

  /**
   * Lists all recorded model profiles ordered by success rate and total tasks.
   */
  public async listProfiles(): Promise<readonly ModelHealthProfile[]> {
    const rows = await this.driver.query<ModelHealthRow>(
      "SELECT * FROM model_health_profiles ORDER BY total_success DESC, total_tasks DESC"
    );
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Resets active model health metrics and consecutive failure counters to clean baseline values.
   * Restores status to 'ACTIVE' for all registered models.
   */
  public async resetAllStats(): Promise<void> {
    await this.driver.execute(
      `UPDATE model_health_profiles SET 
        total_tasks = 0,
        total_success = 0,
        total_failures = 0,
        consecutive_failures = 0,
        avg_latency_ms = 0.0,
        avg_tokens_per_sec = 0.0,
        status = 'ACTIVE'`
    );
  }

  /**
   * Retrieves the currently active arena epoch record, creating a baseline Epoch 1 if missing.
   */
  public async getCurrentEpoch(): Promise<ArenaEpochRecord> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const activeCondition = isPostgres ? "is_active = true" : "is_active = 1";
    const row = await this.driver.queryOne<ArenaEpochRow>(
      `SELECT * FROM arena_epochs WHERE ${activeCondition} ORDER BY epoch_id DESC LIMIT 1`
    );

    if (row) {
      return this.mapEpochRow(row);
    }

    const now = new Date().toISOString();
    await this.driver.execute(
      `INSERT INTO arena_epochs (name, reason, started_at, is_active, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "Epoch 1: Arena Bootstrap & Early Operations",
        "Initial self-hosting bootstrap epoch",
        now,
        this.driver.getDialect() === "postgres" ? true : 1,
        "Pre-failure cascade bootstrap trials"
      ]
    );

    const created = await this.driver.queryOne<ArenaEpochRow>(
      "SELECT * FROM arena_epochs ORDER BY epoch_id DESC LIMIT 1"
    );
    return this.mapEpochRow(created!);
  }

  /**
   * Archives current model metrics to epoch history, closes active epoch,
   * advances to a new clean epoch, and resets model stats to baseline.
   */
  public async advanceEpoch(name: string, reason: string, notes = ""): Promise<ArenaEpochRecord> {
    const current = await this.getCurrentEpoch();
    const now = new Date().toISOString();

    // 1. Snapshot all current model health profiles into model_health_epoch_history
    const profiles = await this.listProfiles();
    for (const p of profiles) {
      await this.driver.execute(
        `INSERT INTO model_health_epoch_history (
          epoch_id, model_id, provider, total_tasks, total_success, total_failures,
          consecutive_failures, avg_latency_ms, avg_tokens_per_sec, status, snapshotted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          current.epochId,
          p.modelId,
          p.provider,
          p.totalTasks,
          p.totalSuccess,
          p.totalFailures,
          p.consecutiveFailures,
          p.avgLatencyMs,
          p.avgTokensPerSec,
          p.status,
          now
        ]
      );
    }

    // 2. Close current epoch
    const inactiveVal = this.driver.getDialect() === "postgres" ? false : 0;
    await this.driver.execute(
      "UPDATE arena_epochs SET is_active = $1, ended_at = $2 WHERE epoch_id = $3",
      [inactiveVal, now, current.epochId]
    );

    // 3. Insert and activate new epoch
    const activeVal = this.driver.getDialect() === "postgres" ? true : 1;
    await this.driver.execute(
      `INSERT INTO arena_epochs (name, reason, started_at, is_active, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, reason, now, activeVal, notes]
    );

    // 4. Reset all active model metrics to clean baseline
    await this.resetAllStats();

    return await this.getCurrentEpoch();
  }

  /**
   * Lists all historical arena epochs in chronological order.
   */
  public async listEpochs(): Promise<readonly ArenaEpochRecord[]> {
    const rows = await this.driver.query<ArenaEpochRow>(
      "SELECT * FROM arena_epochs ORDER BY epoch_id ASC"
    );
    return rows.map((r) => this.mapEpochRow(r));
  }

  /**
   * Retrieves model health snapshots for a specific historical epoch.
   */
  public async getEpochHistory(epochId: number): Promise<readonly ModelHealthProfile[]> {
    const rows = await this.driver.query<ModelHealthRow>(
      "SELECT * FROM model_health_epoch_history WHERE epoch_id = $1 ORDER BY total_success DESC, total_tasks DESC",
      [epochId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  private mapEpochRow(row: ArenaEpochRow): ArenaEpochRecord {
    return {
      epochId: Number(row.epoch_id),
      name: String(row.name),
      reason: String(row.reason),
      startedAt: String(row.started_at),
      endedAt: row.ended_at ? String(row.ended_at) : null,
      isActive: Boolean(row.is_active),
      taskCount: Number(row.task_count || 0),
      successCount: Number(row.success_count || 0),
      failureCount: Number(row.failure_count || 0),
      notes: row.notes ? String(row.notes) : null
    };
  }

  private mapRow(row: ModelHealthRow): ModelHealthProfile {
    return {
      modelId: row.model_id,
      provider: row.provider as InferenceProviderType,
      totalTasks: Number(row.total_tasks),
      totalSuccess: Number(row.total_success),
      totalFailures: Number(row.total_failures),
      consecutiveFailures: Number(row.consecutive_failures),
      avgLatencyMs: Number(row.avg_latency_ms),
      avgTokensPerSec: Number(row.avg_tokens_per_sec),
      status: row.status as ModelStatus,
      lastUsedAt: row.last_used_at ? String(row.last_used_at) : null
    };
  }
}
