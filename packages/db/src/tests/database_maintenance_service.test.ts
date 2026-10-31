import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { DatabaseMaintenanceService } from "../services/DatabaseMaintenanceService.js";

describe("DatabaseMaintenanceService", () => {
  let driver: PGliteDriver;
  let service: DatabaseMaintenanceService;
  let tempDir: string;
  let archiveDir: string;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-maint-test-"));
    archiveDir = path.join(tempDir, "archives");

    service = new DatabaseMaintenanceService({
      driver,
      dataDirPath: tempDir,
      archiveDirPath: archiveDir,
      telemetryRetentionDays: 7,
      maxStorageThresholdBytes: 1024 * 1024,
    });
  });

  afterEach(async () => {
    await driver.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test("should execute vacuum and compaction safely on database", async () => {
    const result = await service.runVacuumAndCompaction();
    assert.equal(result.dialect, "postgres");
    assert.ok(result.durationMs >= 0);
  });

  test("should calculate storage metrics across data directory", async () => {
    const testFile1 = path.join(tempDir, "chunk1.bin");
    const testFile2 = path.join(tempDir, "chunk2.bin");
    fs.writeFileSync(testFile1, Buffer.alloc(1024, 0x01));
    fs.writeFileSync(testFile2, Buffer.alloc(2048, 0x02));

    const metrics = await service.getStorageMetrics();
    assert.equal(metrics.fileCount, 2);
    assert.equal(metrics.totalSizeBytes, 3072);
    assert.equal(metrics.isOverThreshold, false);
  });

  test("should report zero archived count when no old telemetry exists", async () => {
    const result = await service.partitionAndArchiveOldTelemetry();
    assert.equal(result.archivedCount, 0);
    assert.ok(result.cutoffIsoString);
    assert.equal(result.archiveFilePath, undefined);
  });

  test("should archive and prune telemetry older than retention threshold", async () => {
    const oldTimestamp1 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const oldTimestamp2 = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString();
    const recentTimestamp = new Date().toISOString();

    await driver.query(
      `INSERT INTO telemetry_snapshots (timestamp, gpu_busy_pct, edge_temp_c, ppt_watts)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12)`,
      [
        oldTimestamp1, 45.5, 62.0, 110.0,
        oldTimestamp2, 55.0, 65.5, 120.0,
        recentTimestamp, 80.0, 70.0, 140.0,
      ],
    );

    const archiveResult = await service.partitionAndArchiveOldTelemetry(7);
    assert.equal(archiveResult.archivedCount, 2);
    assert.ok(archiveResult.archiveFilePath);
    assert.ok(fs.existsSync(archiveResult.archiveFilePath));

    const remaining = await driver.query<{ readonly timestamp: string }>(
      "SELECT timestamp FROM telemetry_snapshots ORDER BY timestamp ASC",
    );
    assert.equal(remaining.length, 1);
  });
});
