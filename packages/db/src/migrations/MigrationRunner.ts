import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import { MigrationRegistry } from "./MigrationRegistry.js";

/**
 * Interface contract for individual database migrations.
 */
export interface Migration {
  readonly id: string;
  readonly name: string;
  up(driver: IDatabaseDriver): Promise<void>;
  down?(driver: IDatabaseDriver): Promise<void>;
}

/**
 * MigrationRunner
 *
 * Dispatches ordered database schema migrations, tracking applied versions in
 * the _cacophony_migrations audit table across any supported IDatabaseDriver.
 */
export class MigrationRunner {
  private readonly driver: IDatabaseDriver;
  private readonly migrations: readonly Migration[];

  constructor(driver: IDatabaseDriver, migrations?: readonly Migration[]) {
    this.driver = driver;
    this.migrations = migrations ?? MigrationRegistry.getAllMigrations();
  }

  /**
   * Applies all pending migrations in ascending chronological order.
   */
  public async migrate(): Promise<readonly string[]> {
    await this.ensureMigrationTable();

    const appliedRows = await this.driver.query<{ readonly id: string }>(
      "SELECT id FROM _cacophony_migrations ORDER BY applied_at ASC"
    );
    const appliedSet = new Set(appliedRows.map((r) => r.id));

    const newlyApplied: string[] = [];

    for (const migration of this.migrations) {
      if (appliedSet.has(migration.id)) continue;

      await this.driver.transaction(async (tx) => {
        await migration.up(tx);
        await tx.execute(
          "INSERT INTO _cacophony_migrations (id, name, applied_at) VALUES ($1, $2, $3)",
          [migration.id, migration.name, new Date().toISOString()]
        );
      });

      newlyApplied.push(migration.id);
    }

    return newlyApplied;
  }

  private async ensureMigrationTable(): Promise<void> {
    const isPostgres = this.driver.getDialect() === "postgres";
    const timestampType = isPostgres ? "TIMESTAMPTZ" : "TEXT";

    await this.driver.execRaw(`
      CREATE TABLE IF NOT EXISTS _cacophony_migrations (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at ${timestampType} NOT NULL
      );
    `);
  }
}
