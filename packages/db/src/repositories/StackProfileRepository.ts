import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import type { StackProfileRecord } from "@cacophony/shared-types";

interface StackProfileRow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly default_test_runner: string;
  readonly data_json: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * StackProfileRepository
 *
 * Persists and retrieves custom, language-agnostic stack and skill instruction
 * profiles for compilation directives, negative prompts, and test runners.
 */
export class StackProfileRepository {
  private readonly driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Persists or updates a stack instruction profile.
   */
  public async save(profile: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly defaultTestRunner: string;
    readonly dataJson: string;
  }): Promise<StackProfileRecord> {
    const now = new Date().toISOString();

    await this.driver.execute(
      `INSERT INTO stack_instruction_profiles (id, name, description, default_test_runner, data_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         default_test_runner = EXCLUDED.default_test_runner,
         data_json = EXCLUDED.data_json,
         updated_at = EXCLUDED.updated_at`,
      [profile.id, profile.name, profile.description, profile.defaultTestRunner, profile.dataJson, now, now]
    );

    return {
      id: profile.id,
      name: profile.name,
      description: profile.description,
      defaultTestRunner: profile.defaultTestRunner,
      dataJson: profile.dataJson,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Retrieves a stack profile by its unique ID.
   */
  public async getById(id: string): Promise<StackProfileRecord | null> {
    const row = await this.driver.queryOne<StackProfileRow>(
      "SELECT * FROM stack_instruction_profiles WHERE id = $1",
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  /**
   * Lists all registered custom stack profiles.
   */
  public async listAll(): Promise<readonly StackProfileRecord[]> {
    const rows = await this.driver.query<StackProfileRow>(
      "SELECT * FROM stack_instruction_profiles ORDER BY name ASC"
    );
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Deletes a custom stack profile.
   */
  public async delete(id: string): Promise<boolean> {
    const result = await this.driver.execute(
      "DELETE FROM stack_instruction_profiles WHERE id = $1",
      [id]
    );
    return result.rowsAffected > 0;
  }

  private mapRow(row: StackProfileRow): StackProfileRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      defaultTestRunner: row.default_test_runner,
      dataJson: row.data_json,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }
}
