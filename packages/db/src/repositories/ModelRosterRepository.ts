import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type {
  ModelRosterEntry,
  ModelLifecycleTier,
  ModelLifecycleRole,
  UpsertModelRosterInput,
} from "@cacophony/shared-types";
import { randomUUID } from "node:crypto";

export interface ModelRosterDbRow {
  readonly id: string;
  readonly model_id: string;
  readonly tier: string;
  readonly roles_json: string;
  readonly concurrency_limit: number;
  readonly is_active: boolean | number;
  readonly is_protected: boolean | number;
  readonly eval_task_count: number;
  readonly notes: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * ModelRosterRepository
 *
 * Manages database persistence for the active Model Roster, Bullpen, and Boutique pools.
 * Guarantees zero hardcoded model configurations across the arena lifecycle.
 */
export class ModelRosterRepository {
  constructor(private readonly driver: IDatabaseDriver) {}

  private mapRowToEntry(row: ModelRosterDbRow): ModelRosterEntry {
    let parsedRoles: ModelLifecycleRole[] = [];
    try {
      parsedRoles = JSON.parse(row.roles_json || "[]");
    } catch {
      parsedRoles = [];
    }

    return {
      id: row.id,
      modelId: row.model_id,
      tier: row.tier as ModelLifecycleTier,
      roles: parsedRoles,
      concurrencyLimit: Number(row.concurrency_limit || 1),
      isActive: Boolean(row.is_active),
      isProtected: Boolean(row.is_protected),
      evalTaskCount: Number(row.eval_task_count || 0),
      notes: row.notes,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Inserts or updates a model lifecycle entry.
   */
  public async upsert(input: UpsertModelRosterInput): Promise<ModelRosterEntry> {
    const existing = await this.getByModelId(input.modelId);
    const now = new Date().toISOString();
    const id = existing?.id ?? randomUUID();
    const tier = input.tier ?? existing?.tier ?? "ROSTER";
    const roles = input.roles ?? existing?.roles ?? ["implementer"];
    const concurrencyLimit = input.concurrencyLimit ?? existing?.concurrencyLimit ?? 1;
    const isActive = input.isActive !== undefined ? input.isActive : (existing?.isActive ?? true);
    const isProtected = input.isProtected !== undefined ? input.isProtected : (existing?.isProtected ?? true);
    const notes = input.notes !== undefined ? input.notes : (existing?.notes ?? null);
    const rolesJson = JSON.stringify(roles);
    const isPostgres = this.driver.getDialect() === "postgres";
    const createdAt = existing?.createdAt ? new Date(existing.createdAt).toISOString() : now;

    await this.driver.query(
      `INSERT INTO model_roster_entries (
        id, model_id, tier, roles_json, concurrency_limit,
        is_active, is_protected, eval_task_count, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (model_id) DO UPDATE SET
        tier = EXCLUDED.tier,
        roles_json = EXCLUDED.roles_json,
        concurrency_limit = EXCLUDED.concurrency_limit,
        is_active = EXCLUDED.is_active,
        is_protected = EXCLUDED.is_protected,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at`,
      [
        id,
        input.modelId,
        tier,
        rolesJson,
        concurrencyLimit,
        isPostgres ? isActive : (isActive ? 1 : 0),
        isPostgres ? isProtected : (isProtected ? 1 : 0),
        existing?.evalTaskCount ?? 0,
        notes,
        createdAt,
        now,
      ],
    );

    const saved = await this.getByModelId(input.modelId);
    if (!saved) {
      throw new Error(`Failed to retrieve model roster entry after upsert: ${input.modelId}`);
    }
    return saved;
  }

  /**
   * Retrieves a model roster entry by model ID.
   */
  public async getByModelId(modelId: string): Promise<ModelRosterEntry | null> {
    const rows = await this.driver.query<ModelRosterDbRow>(
      `SELECT * FROM model_roster_entries WHERE model_id = $1`,
      [modelId],
    );
    return rows.length > 0 ? this.mapRowToEntry(rows[0]!) : null;
  }

  /**
   * Lists model roster entries by tier with optional active filter.
   */
  public async listByTier(
    tier?: ModelLifecycleTier,
    activeOnly: boolean = false,
  ): Promise<readonly ModelRosterEntry[]> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const activeCondition = activeOnly
      ? `AND is_active = ${isPostgres ? "TRUE" : "1"}`
      : "";

    let rows: readonly ModelRosterDbRow[];
    if (tier) {
      rows = await this.driver.query<ModelRosterDbRow>(
        `SELECT * FROM model_roster_entries WHERE tier = $1 ${activeCondition} ORDER BY updated_at DESC`,
        [tier],
      );
    } else {
      rows = await this.driver.query<ModelRosterDbRow>(
        `SELECT * FROM model_roster_entries WHERE 1=1 ${activeCondition} ORDER BY tier ASC, updated_at DESC`,
      );
    }

    return rows.map((r) => this.mapRowToEntry(r));
  }

  /**
   * Retrieves all active core models on the Roster.
   */
  public async getActiveRoster(): Promise<readonly ModelRosterEntry[]> {
    return this.listByTier("ROSTER", true);
  }

  /**
   * Retrieves all candidate models in the Bullpen awaiting evaluation or promotion.
   */
  public async getActiveBullpen(): Promise<readonly ModelRosterEntry[]> {
    return this.listByTier("BULLPEN", true);
  }

  /**
   * Retrieves active model IDs designated for a specific role.
   */
  public async getModelsForRole(role: ModelLifecycleRole): Promise<readonly string[]> {
    const roster = await this.getActiveRoster();
    return roster
      .filter((entry) => entry.roles.includes(role))
      .map((entry) => entry.modelId);
  }

  /**
   * Increments the evaluation task counter for a candidate model.
   */
  public async incrementEvalCount(modelId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.execute(
      `UPDATE model_roster_entries SET eval_task_count = eval_task_count + 1, updated_at = $1 WHERE model_id = $2`,
      [now, modelId],
    );
  }

  /**
   * Deletes a model from the lifecycle table.
   */
  public async delete(modelId: string): Promise<void> {
    await this.driver.execute(
      `DELETE FROM model_roster_entries WHERE model_id = $1`,
      [modelId],
    );
  }
}
