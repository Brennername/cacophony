// packages/db/src/services/DatabaseBackupService.ts

import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path from "node:path";

export interface BackupServiceOptions {
  /** Source PGlite or SQLite database directory or file */
  readonly dbDir: string;
  /** Directory where snapshots will be stored */
  readonly backupDir?: string;
  /** Maximum number of snapshots to retain before pruning */
  readonly defaultRetentionCount?: number;
}

export interface BackupResult {
  readonly snapshotPath: string;
  readonly timestamp: string;
  readonly sizeBytes: number;
  readonly prunedSnapshots: readonly string[];
}

export interface SnapshotInfo {
  readonly name: string;
  readonly path: string;
  readonly timestamp: string;
  readonly sizeBytes: number;
}

/**
 * Calculates the recursive disk usage of a directory or file in bytes.
 */
async function getDiskUsageBytes(targetPath: string): Promise<number> {
  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      return stat.size;
    }

    let total = 0;
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDiskUsageBytes(full);
      } else if (entry.isFile()) {
        const fileStat = await fs.stat(full);
        total += fileStat.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Service managing timestamped physical snapshots of the database storage directory,
 * retention-based rotation, and lock-state integrity checks.
 */
export class DatabaseBackupService {
  private readonly dbDir: string;
  private readonly backupDir: string;
  private readonly defaultRetentionCount: number;

  constructor(options: BackupServiceOptions) {
    this.dbDir = path.resolve(options.dbDir);
    this.backupDir = options.backupDir
      ? path.resolve(options.backupDir)
      : path.join(this.dbDir, "..", "backups");
    this.defaultRetentionCount = options.defaultRetentionCount ?? 5;
  }

  /**
   * Verifies that the database directory is not actively locked by another process.
   * If the lock belongs to the current process (such as a running daemon taking an on-demand snapshot),
   * the operation is permitted. If locked by a foreign or unknown process, it is aborted.
   */
  private checkDatabaseLock(): void {
    const lockFilePath = `${this.dbDir}.lock`;
    if (fsSync.existsSync(lockFilePath)) {
      try {
        const lockContent = fsSync.readFileSync(lockFilePath, "utf-8").trim();
        const parts = lockContent.split(":");
        const pid = parseInt(parts[0] || "", 10);
        if (isNaN(pid) || pid !== process.pid) {
          throw new Error(
            `Database is currently locked (${lockFilePath} exists); snapshot creation aborted to prevent corruption`,
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("Database is currently locked")) {
          throw err;
        }
      }
    }

    const postmasterPid = path.join(this.dbDir, "postmaster.pid");
    if (fsSync.existsSync(postmasterPid)) {
      try {
        const pidContent = fsSync
          .readFileSync(postmasterPid, "utf-8")
          .trim()
          .split("\n")[0] || "";
        const pid = parseInt(pidContent, 10);
        // -42 is the standard sentinel PID emitted by PGlite in WASM mode
        if (pid !== -42 && (isNaN(pid) || pid !== process.pid)) {
          throw new Error(
            `Database is currently locked (${postmasterPid} exists); snapshot creation aborted to prevent corruption`,
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("Database is currently locked")) {
          throw err;
        }
      }
    }
  }

  /**
   * Creates an atomic, timestamped directory snapshot of the database files.
   * Prunes oldest snapshots when count exceeds retentionCount.
   */
  public async createSnapshot(retentionCount?: number): Promise<BackupResult> {
    if (!fsSync.existsSync(this.dbDir)) {
      throw new Error(`Database directory does not exist: ${this.dbDir}`);
    }

    this.checkDatabaseLock();

    await fs.mkdir(this.backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const snapshotName = `snapshot-${timestamp}`;
    const targetPath = path.join(this.backupDir, snapshotName);

    // Recursively copy database directory, excluding transient lock/socket/postmaster files
    await fs.cp(this.dbDir, targetPath, {
      recursive: true,
      filter: (source) => {
        const basename = path.basename(source);
        return (
          !basename.endsWith(".lock") &&
          !basename.endsWith(".sock") &&
          basename !== "postmaster.pid"
        );
      },
    });

    const sizeBytes = await getDiskUsageBytes(targetPath);

    const limit = retentionCount ?? this.defaultRetentionCount;
    const prunedSnapshots = await this.pruneOldSnapshots(limit);

    return {
      snapshotPath: targetPath,
      timestamp,
      sizeBytes,
      prunedSnapshots,
    };
  }

  /**
   * Lists all existing snapshots sorted chronologically (oldest first).
   */
  public async listSnapshots(): Promise<SnapshotInfo[]> {
    if (!fsSync.existsSync(this.backupDir)) {
      return [];
    }

    const entries = await fs.readdir(this.backupDir, { withFileTypes: true });
    const snapshots: SnapshotInfo[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("snapshot-")) {
        const fullPath = path.join(this.backupDir, entry.name);
        const timestamp = entry.name.replace(/^snapshot-/, "");
        const sizeBytes = await getDiskUsageBytes(fullPath);
        snapshots.push({
          name: entry.name,
          path: fullPath,
          timestamp,
          sizeBytes,
        });
      }
    }

    return snapshots.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Prunes oldest snapshots leaving only retentionCount most recent snapshots.
   */
  public async pruneOldSnapshots(retentionCount: number): Promise<string[]> {
    if (retentionCount < 1) {
      return [];
    }

    const snapshots = await this.listSnapshots();
    const pruned: string[] = [];

    if (snapshots.length > retentionCount) {
      const excessCount = snapshots.length - retentionCount;
      const candidates = snapshots.slice(0, excessCount);

      for (const item of candidates) {
        await fs.rm(item.path, { recursive: true, force: true });
        pruned.push(item.path);
      }
    }

    return pruned;
  }
}
