import * as fs from "node:fs";
import * as path from "node:path";
import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

/**
 * Storage metrics for database maintenance and capacity planning.
 */
export interface StorageMetrics {
  readonly dataDirPath: string;
  readonly totalSizeBytes: number;
  readonly totalSizeMegabytes: number;
  readonly fileCount: number;
  readonly isOverThreshold: boolean;
  readonly thresholdBytes: number;
}

/**
 * Archival result for pruned telemetry snapshots.
 */
export interface TelemetryPartitionArchiveResult {
  readonly archivedCount: number;
  readonly cutoffIsoString: string;
  readonly archiveFilePath?: string;
}

/**
 * Options for configuring DatabaseMaintenanceService.
 */
export interface DatabaseMaintenanceConfig {
  readonly driver: IDatabaseDriver;
  readonly dataDirPath?: string;
  readonly maxStorageThresholdBytes?: number; // Default 500 MB
  readonly telemetryRetentionDays?: number;   // Default 14 days
  readonly archiveDirPath?: string;
}

/**
 * DatabaseMaintenanceService
 *
 * Provides periodic WAL compaction, VACUUM ANALYZE maintenance, disk storage
 * directory size monitoring, and automated telemetry table partitioning/archival.
 */
export class DatabaseMaintenanceService {
  private readonly driver: IDatabaseDriver;
  private readonly dataDirPath: string;
  private readonly maxStorageThresholdBytes: number;
  private readonly telemetryRetentionDays: number;
  private readonly archiveDirPath: string;

  constructor(config: DatabaseMaintenanceConfig) {
    this.driver = config.driver;
    this.dataDirPath = config.dataDirPath ?? "data/cacophony_pglite";
    this.maxStorageThresholdBytes = config.maxStorageThresholdBytes ?? 500 * 1024 * 1024;
    this.telemetryRetentionDays = config.telemetryRetentionDays ?? 14;
    this.archiveDirPath = config.archiveDirPath ?? path.join(this.dataDirPath, "archives");
  }

  /**
   * Executes database optimization, VACUUM, and checkpoint compaction.
   * Uses non-locking execution compatible with active concurrent reader/writer transactions.
   */
  public async runVacuumAndCompaction(): Promise<{ readonly durationMs: number; readonly dialect: string }> {
    const start = Date.now();
    const dialect = this.driver.getDialect();

    if (dialect === "postgres") {
      // PGlite / PostgreSQL supports standard VACUUM and ANALYZE
      await this.driver.execRaw("VACUUM ANALYZE;");
    } else if (dialect === "sqlite") {
      // In SQLite, run PRAGMA incremental_vacuum or optimize and WAL checkpoint
      await this.driver.execRaw("PRAGMA optimize;");
      await this.driver.execRaw("PRAGMA wal_checkpoint(PASSIVE);");
    }

    return {
      durationMs: Date.now() - start,
      dialect
    };
  }

  /**
   * Calculates the storage directory size for the underlying database storage.
   * If directory does not exist or is in-memory, returns safe zero defaults.
   */
  public async getStorageMetrics(): Promise<StorageMetrics> {
    const resolvedPath = path.resolve(this.dataDirPath);

    if (!fs.existsSync(resolvedPath)) {
      return {
        dataDirPath: resolvedPath,
        totalSizeBytes: 0,
        totalSizeMegabytes: 0,
        fileCount: 0,
        isOverThreshold: false,
        thresholdBytes: this.maxStorageThresholdBytes
      };
    }

    let totalBytes = 0;
    let fileCount = 0;

    const traverse = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        try {
          if (entry.isDirectory()) {
            traverse(fullPath);
          } else if (entry.isFile()) {
            const stats = fs.statSync(fullPath);
            totalBytes += stats.size;
            fileCount++;
          }
        } catch {
          // Ignore transient file lock issues
        }
      }
    };

    traverse(resolvedPath);

    const totalMb = Number((totalBytes / (1024 * 1024)).toFixed(2));
    const isOver = totalBytes >= this.maxStorageThresholdBytes;

    return {
      dataDirPath: resolvedPath,
      totalSizeBytes: totalBytes,
      totalSizeMegabytes: totalMb,
      fileCount,
      isOverThreshold: isOver,
      thresholdBytes: this.maxStorageThresholdBytes
    };
  }

  /**
   * Partitions / archives telemetry snapshots older than the configured retention period
   * to a compressed JSON archive file, then purges them from the operational database table.
   */
  public async partitionAndArchiveOldTelemetry(
    retentionDaysOverride?: number
  ): Promise<TelemetryPartitionArchiveResult> {
    const days = retentionDaysOverride ?? this.telemetryRetentionDays;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();

    // Query older snapshots
    const oldSnapshots = await this.driver.query<{
      timestamp: string;
      gpu_busy_pct: number;
      edge_temp_c: number;
      ppt_watts: number;
    }>(
      "SELECT timestamp, gpu_busy_pct, edge_temp_c, ppt_watts FROM telemetry_snapshots WHERE timestamp < $1 ORDER BY timestamp ASC",
      [cutoffIso]
    );

    if (oldSnapshots.length === 0) {
      return {
        archivedCount: 0,
        cutoffIsoString: cutoffIso
      };
    }

    // Write to archive file in JSON format
    fs.mkdirSync(this.archiveDirPath, { recursive: true });
    const archiveFilename = `telemetry-archive-${cutoffDate.toISOString().replace(/[:.]/g, "-")}.json`;
    const archivePath = path.join(this.archiveDirPath, archiveFilename);

    fs.writeFileSync(archivePath, JSON.stringify(oldSnapshots, null, 2), "utf-8");

    // Purge archived records from operational table
    await this.driver.execute("DELETE FROM telemetry_snapshots WHERE timestamp < $1", [cutoffIso]);

    return {
      archivedCount: oldSnapshots.length,
      cutoffIsoString: cutoffIso,
      archiveFilePath: archivePath
    };
  }
}
