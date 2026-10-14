import * as fs from "node:fs";
import * as path from "node:path";
import { createGzip } from "node:zlib";
import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

export interface StorageMetrics {
  readonly dataDirPath: string;
  readonly totalSizeBytes: number;
  readonly totalSizeMegabytes: number;
  readonly fileCount: number;
  readonly isOverThreshold: boolean;
  readonly thresholdBytes: number;
}

export interface TelemetryPartitionArchiveResult {
  readonly archivedCount: number;
  readonly cutoffIsoString: string;
  readonly archiveFilePath?: string;
}

export interface DatabaseMaintenanceConfig {
  readonly driver: IDatabaseDriver;
  readonly dataDirPath?: string;
  readonly maxStorageThresholdBytes?: number; // Default 500 MB
  readonly telemetryRetentionDays?: number;   // Default 30 days
  readonly archiveDirPath?: string;
}

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
    this.telemetryRetentionDays = config.telemetryRetentionDays ?? 30;
    this.archiveDirPath = config.archiveDirPath ?? path.join(this.dataDirPath, "archives");
  }

  /**
   * Executes database storage compaction and index optimization.
   * Supports optional full compaction mode to rewrite relation files and reclaim disk space.
   *
   * @param options Optional maintenance options including full vacuum execution.
   */
  public async runVacuumAndCompaction(options?: { readonly full?: boolean }): Promise<{ readonly durationMs: number; readonly dialect: string }> {
    const start = Date.now();
    const dialect = this.driver.getDialect();

    if (dialect === "postgres") {
      // PGlite (WASM) crashes with 'table index is out of bounds' on VACUUM FULL relation replacement.
      // Standard VACUUM ANALYZE safely reclaims dead tuples into the free-space map and CHECKPOINT flushes WAL.
      await this.driver.execRaw("VACUUM ANALYZE;");
      try {
        await this.driver.execRaw("CHECKPOINT;");
      } catch {
        // checkpointing may be non-fatal or no-op depending on WASM filesystem sync
      }
    } else if (dialect === "sqlite") {
      if (options?.full) {
        await this.driver.execRaw("VACUUM;");
      }
      await this.driver.execRaw("PRAGMA optimize;");
      await this.driver.execRaw("PRAGMA wal_checkpoint(PASSIVE);");
    }

    return {
      durationMs: Date.now() - start,
      dialect
    };
  }

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

  public async partitionAndArchiveOldTelemetry(
    retentionDaysOverride?: number
  ): Promise<TelemetryPartitionArchiveResult> {
    const days = retentionDaysOverride ?? this.telemetryRetentionDays;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();

    const countRes = await this.driver.query<{ readonly count: string | number }>(
      "SELECT count(*) as count FROM telemetry_snapshots WHERE timestamp < $1",
      [cutoffIso]
    );
    const totalMatching = Number(countRes[0]?.count ?? 0);

    if (totalMatching === 0) {
      return {
        archivedCount: 0,
        cutoffIsoString: cutoffIso
      };
    }

    fs.mkdirSync(this.archiveDirPath, { recursive: true });
    const archiveFilename = `telemetry-archive-${cutoffDate.toISOString().replace(/[:.]/g, "-")}.json.gz`;
    const archivePath = path.join(this.archiveDirPath, archiveFilename);

    const gzipStream = createGzip({ level: 9 });
    const fileStream = fs.createWriteStream(archivePath, { flags: "w" });
    gzipStream.pipe(fileStream);
    gzipStream.write("[\n");

    const batchSize = 1000;
    let archivedCount = 0;
    let isFirst = true;

    while (archivedCount < totalMatching) {
      const batch = await this.driver.query<{
        readonly timestamp: string;
        readonly gpu_busy_pct: number;
        readonly edge_temp_c: number;
        readonly ppt_watts: number;
      }>(
        "SELECT timestamp, gpu_busy_pct, edge_temp_c, ppt_watts FROM telemetry_snapshots WHERE timestamp < $1 ORDER BY timestamp ASC LIMIT $2",
        [cutoffIso, batchSize]
      );

      if (batch.length === 0) {
        break;
      }

      for (const item of batch) {
        const line = (isFirst ? "" : ",\n") + JSON.stringify(item);
        gzipStream.write(line);
        isFirst = false;
      }

      const timestamps = batch.map((s) => s.timestamp);
      const placeholders = timestamps.map((_, idx) => `$${idx + 1}`).join(", ");
      await this.driver.execute(
        `DELETE FROM telemetry_snapshots WHERE timestamp IN (${placeholders})`,
        timestamps
      );

      archivedCount += batch.length;
    }

    gzipStream.write("\n]\n");
    gzipStream.end();
    await new Promise<void>((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
      gzipStream.on("error", reject);
    });

    return {
      archivedCount,
      cutoffIsoString: cutoffIso,
      archiveFilePath: archivePath
    };
  }
}
