import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { ModelTuningProfile } from "@cacophony/shared-types";

export interface ModelTuningProfileDbRow {
  readonly id: string;
  readonly model_name: string;
  readonly role: string;
  readonly num_predict: number;
  readonly num_ctx: number;
  readonly temperature: number;
  readonly top_k: number;
  readonly top_p: number;
  readonly repeat_penalty: number;
  readonly auto_tuned: boolean | number;
  readonly is_active: boolean | number;
  readonly created_at: string;
  readonly updated_at: string;
}

export class ModelProfileRepository {
  constructor(private readonly driver: IDatabaseDriver) {}

  private mapRowToProfile(row: ModelTuningProfileDbRow): ModelTuningProfile {
    return {
      id: row.id,
      modelName: row.model_name,
      role: row.role,
      numPredict: Number(row.num_predict),
      numCtx: Number(row.num_ctx),
      temperature: Number(row.temperature),
      topK: Number(row.top_k),
      topP: Number(row.top_p),
      repeatPenalty: Number(row.repeat_penalty),
      autoTuned: Boolean(row.auto_tuned),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  public async getActiveProfile(modelName: string, role?: string): Promise<ModelTuningProfile | null> {
    const isPostgres = this.driver.getDialect() === "postgres";
    let rows: readonly ModelTuningProfileDbRow[] = [];

    if (role) {
      rows = await this.driver.query<ModelTuningProfileDbRow>(
        `SELECT * FROM model_tuning_profiles
         WHERE model_name = $1 AND role = $2 AND is_active = ${isPostgres ? "TRUE" : "1"}
         ORDER BY updated_at DESC LIMIT 1`,
        [modelName, role]
      );
    }

    if (rows.length === 0) {
      rows = await this.driver.query<ModelTuningProfileDbRow>(
        `SELECT * FROM model_tuning_profiles
         WHERE model_name = $1 AND is_active = ${isPostgres ? "TRUE" : "1"}
         ORDER BY updated_at DESC LIMIT 1`,
        [modelName]
      );
    }

    const row = rows[0];
    return row ? this.mapRowToProfile(row) : null;
  }

  public async listAllProfiles(): Promise<ModelTuningProfile[]> {
    const rows = await this.driver.query<ModelTuningProfileDbRow>(
      `SELECT * FROM model_tuning_profiles ORDER BY model_name ASC, role ASC`
    );
    return rows.map((r) => this.mapRowToProfile(r));
  }

  public async upsertProfile(profile: Omit<ModelTuningProfile, "createdAt" | "updatedAt">): Promise<ModelTuningProfile> {
    const now = new Date().toISOString();
    const isPostgres = this.driver.getDialect() === "postgres";

    await this.driver.query(
      `INSERT INTO model_tuning_profiles (
        id, model_name, role, num_predict, num_ctx, temperature, top_k, top_p,
        repeat_penalty, auto_tuned, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        model_name = EXCLUDED.model_name,
        role = EXCLUDED.role,
        num_predict = EXCLUDED.num_predict,
        num_ctx = EXCLUDED.num_ctx,
        temperature = EXCLUDED.temperature,
        top_k = EXCLUDED.top_k,
        top_p = EXCLUDED.top_p,
        repeat_penalty = EXCLUDED.repeat_penalty,
        auto_tuned = EXCLUDED.auto_tuned,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at`,
      [
        profile.id,
        profile.modelName,
        profile.role,
        profile.numPredict,
        profile.numCtx,
        profile.temperature,
        profile.topK,
        profile.topP,
        profile.repeatPenalty,
        isPostgres ? profile.autoTuned : (profile.autoTuned ? 1 : 0),
        isPostgres ? profile.isActive : (profile.isActive ? 1 : 0),
        now,
        now
      ]
    );

    return {
      ...profile,
      createdAt: now,
      updatedAt: now
    };
  }

  public async deleteProfile(id: string): Promise<boolean> {
    const result = await this.driver.execute(
      `DELETE FROM model_tuning_profiles WHERE id = $1`,
      [id]
    );
    return result.rowsAffected > 0;
  }
}
