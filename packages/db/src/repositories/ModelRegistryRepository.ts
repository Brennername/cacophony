import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

export interface ModelRegistryRecord {
  readonly model_id: string;
  readonly family: string;
  readonly provider: string;
  readonly context_window_size: number;
  readonly max_output_tokens: number;
  readonly tool_calling: boolean;
  readonly diff_format: boolean;
  readonly cost_per_1k_tokens: number;
  readonly is_local: boolean;
  readonly tags_json: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export class ModelRegistryRepository {
  constructor(private readonly driver: IDatabaseDriver) {}

  public async upsert(record: Omit<ModelRegistryRecord, "created_at" | "updated_at">): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.query(
      `INSERT INTO model_registry_entries (
        model_id, family, provider, context_window_size, max_output_tokens,
        tool_calling, diff_format, cost_per_1k_tokens, is_local, tags_json,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (model_id) DO UPDATE SET
        family = EXCLUDED.family,
        provider = EXCLUDED.provider,
        context_window_size = EXCLUDED.context_window_size,
        max_output_tokens = EXCLUDED.max_output_tokens,
        tool_calling = EXCLUDED.tool_calling,
        diff_format = EXCLUDED.diff_format,
        cost_per_1k_tokens = EXCLUDED.cost_per_1k_tokens,
        is_local = EXCLUDED.is_local,
        tags_json = EXCLUDED.tags_json,
        updated_at = EXCLUDED.updated_at`,
      [
        record.model_id,
        record.family,
        record.provider,
        record.context_window_size,
        record.max_output_tokens,
        record.tool_calling,
        record.diff_format,
        record.cost_per_1k_tokens,
        record.is_local,
        record.tags_json,
        now,
        now
      ]
    );
  }

  public async getById(modelId: string): Promise<ModelRegistryRecord | undefined> {
    const rows = await this.driver.query<ModelRegistryRecord>(
      `SELECT * FROM model_registry_entries WHERE model_id = $1`,
      [modelId]
    );
    return rows[0];
  }

  public async listAll(): Promise<readonly ModelRegistryRecord[]> {
    return this.driver.query<ModelRegistryRecord>(
      `SELECT * FROM model_registry_entries ORDER BY is_local DESC, cost_per_1k_tokens ASC`
    );
  }

  public async delete(modelId: string): Promise<void> {
    await this.driver.execute(
      `DELETE FROM model_registry_entries WHERE model_id = $1`,
      [modelId]
    );
  }
}
