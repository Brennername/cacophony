import type { Migration } from "./MigrationRunner.js";
import { migration001 } from "./001_initial_schema.js";
import { migration002 } from "./002_stack_profiles.js";
import { migration003 } from "./003_lsp_diagnostics.js";
import { migration004 } from "./004_model_registry.js";

/**
 * MigrationRegistry
 *
 * Central registry holding all registered database migrations in chronological sequence.
 * Decouples consumers (daemon, tests, CLI) from individual migration files.
 */
export class MigrationRegistry {
  private static readonly migrations: Migration[] = [
    migration001,
    migration002,
    migration003,
    migration004
  ];

  /**
   * Returns all registered migrations in ascending execution order.
   */
  public static getAllMigrations(): readonly Migration[] {
    return [...MigrationRegistry.migrations];
  }

  /**
   * Registers an additional migration into the registry.
   */
  public static register(migration: Migration): void {
    if (MigrationRegistry.migrations.some((m) => m.id === migration.id)) {
      return;
    }
    MigrationRegistry.migrations.push(migration);
  }
}
