import * as fs from "node:fs";
import * as path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

export class PGliteDriver implements IDatabaseDriver {
  private pg: PGlite | null = null;
  private readonly dataDir: string | undefined;
  private lockFile: string | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dataDir?: string) {
    this.dataDir = dataDir;
  }

  /**
   * Serializes async operations to prevent concurrent non-reentrant WASM memory corruption.
   */
  private async runSerialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(() => {}, () => {});
    return next;
  }

  public async connect(): Promise<void> {
    if (this.pg) return;
    if (this.dataDir) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      const postmasterPid = path.join(this.dataDir, "postmaster.pid");
      if (fs.existsSync(postmasterPid)) {
        try {
          fs.unlinkSync(postmasterPid);
        } catch {
          // ignore
        }
      }
    }
    this.lockFile = this.dataDir ? `${this.dataDir}.lock` : null;
    await this.checkLockFile();
    this.pg = this.dataDir ? new PGlite(this.dataDir) : new PGlite();
    await this.pg.waitReady;
  }

  public async close(): Promise<void> {
    if (!this.pg) return;
    await this.runSerialized(async () => {
      if (!this.pg) return;
      await this.pg.close();
      this.pg = null;
    });
    if (this.lockFile && fs.existsSync(this.lockFile)) {
      try {
        fs.unlinkSync(this.lockFile);
      } catch {
        // ignore
      }
    }
  }

  public async query<T = unknown>(sql: string, params: readonly unknown[] = []): Promise<readonly T[]> {
    this.ensureConnected();
    return this.runSerialized(async () => {
      const result = await this.pg!.query<T>(sql, params as unknown[]);
      return result.rows;
    });
  }

  public async queryOne<T = unknown>(sql: string, params: readonly unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  public async execute(sql: string, params: readonly unknown[] = []): Promise<{ readonly rowsAffected: number }> {
    this.ensureConnected();
    return this.runSerialized(async () => {
      const result = await this.pg!.query(sql, params as unknown[]);
      return { rowsAffected: result.affectedRows ?? 0 };
    });
  }

  public async execRaw(sql: string): Promise<void> {
    this.ensureConnected();
    return this.runSerialized(async () => {
      await this.pg!.exec(sql);
    });
  }

  public async transaction<T>(fn: (driver: IDatabaseDriver) => Promise<T>): Promise<T> {
    this.ensureConnected();
    return this.runSerialized(async () => {
      return this.pg!.transaction(async (tx) => {
        const txDriver: IDatabaseDriver = {
          connect: async () => {},
          close: async () => {},
          query: async <R = unknown>(sql: string, params: readonly unknown[] = []) => {
            const res = await tx.query<R>(sql, params as unknown[]);
            return res.rows;
          },
          queryOne: async <R = unknown>(sql: string, params: readonly unknown[] = []) => {
            const res = await tx.query<R>(sql, params as unknown[]);
            return res.rows[0] ?? null;
          },
          execute: async (sql: string, params: readonly unknown[] = []) => {
            const res = await tx.query(sql, params as unknown[]);
            return { rowsAffected: res.affectedRows ?? 0 };
          },
          execRaw: async (sql: string) => {
            await tx.exec(sql);
          },
          transaction: async <SubT>(subFn: (driver: IDatabaseDriver) => Promise<SubT>) => {
            return subFn(txDriver);
          },
          getDialect: () => "postgres"
        };
        return fn(txDriver);
      });
    });
  }

  public getDialect(): "postgres" {
    return "postgres";
  }

  private ensureConnected(): void {
    if (!this.pg) {
      throw new Error("PGlite database is not connected. Call connect() before issuing queries.");
    }
  }

  private async checkLockFile(): Promise<void> {
    if (!this.lockFile) return;
    if (fs.existsSync(this.lockFile)) {
      const lockFileContent = fs.readFileSync(this.lockFile, "utf-8").trim();
      const parts = lockFileContent.split(":");
      const pid = parts.length === 2 ? parseInt(parts[0] || "", 10) : NaN;
      const lockTimestamp = parts.length === 2 ? parseInt(parts[1] || "", 10) : parseInt(parts[0] || "", 10);

      let isStale = false;
      if (!isNaN(pid) && pid > 0) {
        try {
          process.kill(pid, 0);
          isStale = false;
        } catch (err: unknown) {
          if ((err as NodeJS.ErrnoException).code === "ESRCH") {
            isStale = true;
          }
        }
      }

      if (isNaN(lockTimestamp) || (Date.now() - lockTimestamp > 15 * 1000)) {
        isStale = true;
      }

      if (isStale) {
        try {
          fs.unlinkSync(this.lockFile);
        } catch {
          // ignore
        }
      } else {
        throw new Error("Database connection is already in use by another process.");
      }
    }

    try {
      fs.writeFileSync(this.lockFile, `${process.pid}:${Date.now()}`);
      process.once("exit", () => {
        if (this.lockFile && fs.existsSync(this.lockFile)) {
          try {
            fs.unlinkSync(this.lockFile);
          } catch {
            // ignore
          }
        }
      });
    } catch {
      // ignore
    }
  }
}