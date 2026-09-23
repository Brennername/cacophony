/**
 * Generic abstraction interface for SQL database drivers.
 * Allows decoupling application repositories from specific database engines
 * (PGlite, PostgreSQL, SQLite, or MariaDB).
 */
export interface IDatabaseDriver {
  /**
   * Initializes connections and storage engines.
   */
  connect(): Promise<void>;

  /**
   * Gracefully terminates database connections and closes file locks.
   */
  close(): Promise<void>;

  /**
   * Executes a parameterized SELECT query returning zero or more typed rows.
   */
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<readonly T[]>;

  /**
   * Executes a parameterized SELECT query returning the first matching row or null.
   */
  queryOne<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T | null>;

  /**
   * Executes a mutating DML statement (INSERT, UPDATE, DELETE) and returns row count.
   */
  execute(sql: string, params?: readonly unknown[]): Promise<{ readonly rowsAffected: number }>;

  /**
   * Executes raw multi-statement DDL script (used primarily for schema migrations).
   */
  execRaw(sql: string): Promise<void>;

  /**
   * Wraps operations in an atomic transaction with automatic rollback on error.
   */
  transaction<T>(fn: (driver: IDatabaseDriver) => Promise<T>): Promise<T>;

  /**
   * Returns SQL dialect dialect family for query formatting.
   */
  getDialect(): "postgres" | "sqlite" | "mariadb";
}
