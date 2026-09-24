import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";
import { PGliteDriver } from "./PGliteDriver.js";
import { SQLiteDriver } from "./SQLiteDriver.js";

/**
 * Supported database engine driver identifiers.
 */
export type SupportedDatabaseDriverType = "pglite" | "postgres" | "sqlite" | "mariadb";

/**
 * Driver connection configuration options.
 */
export interface DatabaseDriverConfig {
  readonly driver?: SupportedDatabaseDriverType;
  readonly connectionString?: string;
  readonly dataDir?: string;
  readonly sqliteDbPath?: string;
}

/**
 * DatabaseDriverFactory
 *
 * Provides factory instantiation for database drivers based on DB_DRIVER environment
 * variables or explicit configuration schemas, maintaining engine portability.
 */
export class DatabaseDriverFactory {
  /**
   * Instantiates and returns an IDatabaseDriver based on provided options or process.env.
   */
  public static createDriver(config: DatabaseDriverConfig = {}): IDatabaseDriver {
    const driverType = (
      config.driver ??
      process.env.DB_DRIVER ??
      "pglite"
    ).toLowerCase() as SupportedDatabaseDriverType;

    const connectionString = config.connectionString ?? process.env.DB_CONNECTION_STRING;

    switch (driverType) {
      case "sqlite": {
        const dbPath = config.sqliteDbPath ?? connectionString ?? ":memory:";
        return new SQLiteDriver(dbPath);
      }
      case "pglite":
      case "postgres":
      default: {
        // PGlite runs in-process PostgreSQL WASM; dataDir or path passed
        const dataDir = config.dataDir ?? connectionString ?? "data/cacophony_pglite";
        return new PGliteDriver(dataDir);
      }
    }
  }
}
