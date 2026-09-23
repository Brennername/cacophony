import { DatabaseSync } from "node:sqlite";
import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

/**
 * SQLiteDriver
 *
 * Implements IDatabaseDriver using Node 22 built-in node:sqlite module.
 * Provides a lightweight embedded fallback with zero native build dependencies.
 */
export class SQLiteDriver implements IDatabaseDriver {
  private db: DatabaseSync | null = null;
  private readonly dbPath: string;

  constructor(dbPath: string = ":memory:") {
    this.dbPath = dbPath;
  }

  public async connect(): Promise<void> {
    if (this.db) return;
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
  }

  public async close(): Promise<void> {
    if (!this.db) return;
    this.db.close();
    this.db = null;
  }

  public async query<T = unknown>(sql: string, params: readonly unknown[] = []): Promise<readonly T[]> {
    this.ensureConnected();
    const normalizedSql = this.normalizeSql(sql);
    const stmt = this.db!.prepare(normalizedSql);
    // Cast through unknown to bypass strict SQLInputValue union constraints
    const rows = (stmt.all as (...args: unknown[]) => unknown[])(...params);
    return rows as T[];
  }

  public async queryOne<T = unknown>(sql: string, params: readonly unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  public async execute(sql: string, params: readonly unknown[] = []): Promise<{ readonly rowsAffected: number }> {
    this.ensureConnected();
    const normalizedSql = this.normalizeSql(sql);
    const stmt = this.db!.prepare(normalizedSql);
    const result = (stmt.run as (...args: unknown[]) => { changes: number | bigint })(...params);
    return { rowsAffected: Number(result.changes) };
  }

  public async execRaw(sql: string): Promise<void> {
    this.ensureConnected();
    this.db!.exec(sql);
  }

  public async transaction<T>(fn: (driver: IDatabaseDriver) => Promise<T>): Promise<T> {
    this.ensureConnected();
    this.db!.exec("BEGIN TRANSACTION");
    try {
      const result = await fn(this);
      this.db!.exec("COMMIT");
      return result;
    } catch (error) {
      this.db!.exec("ROLLBACK");
      throw error;
    }
  }

  public getDialect(): "sqlite" {
    return "sqlite";
  }

  /**
   * Translates PostgreSQL positional parameters ($1, $2) to SQLite standard question marks (?).
   */
  private normalizeSql(sql: string): string {
    return sql.replace(/\$[0-9]+/g, "?");
  }

  private ensureConnected(): void {
    if (!this.db) {
      throw new Error("SQLite database is not connected. Call connect() before issuing queries.");
    }
  }
}
