import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { ModelHealthProfile, ModelStatus, InferenceProviderType } from "@cacophony/shared-types";

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
