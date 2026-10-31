// packages/db/src/__tests__/backup_service.test.ts

import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import { DatabaseBackupService } from "../services/DatabaseBackupService.js";

describe("T74.7.4: DatabaseBackupService Snapshot Creation, Retention Pruning, and Lock Enforcement", () => {
  let testRoot: string;
  let dbDir: string;
  let backupDir: string;

  before(async () => {
    testRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cacophony-backup-test-"));
    dbDir = path.join(testRoot, "pglite_data");
    backupDir = path.join(testRoot, "backups");

    await fs.mkdir(dbDir, { recursive: true });
    // Populate mock DB data
    await fs.writeFile(path.join(dbDir, "base_table.dat"), "sample database table data", "utf-8");
    await fs.writeFile(path.join(dbDir, "catalog.idx"), "sample index data", "utf-8");
  });

  after(async () => {
    await fs.rm(testRoot, { recursive: true, force: true });
  });

  it("should create a timestamped snapshot of the database directory", async () => {
    const service = new DatabaseBackupService({
      dbDir,
      backupDir,
      defaultRetentionCount: 5,
    });

    const result = await service.createSnapshot();

    assert.ok(result.snapshotPath.includes("snapshot-"));
    assert.ok(result.sizeBytes > 0);
    assert.equal(result.prunedSnapshots.length, 0);

    // Verify files were actually copied into the snapshot
    const copiedFiles = await fs.readdir(result.snapshotPath);
    assert.ok(copiedFiles.includes("base_table.dat"));
    assert.ok(copiedFiles.includes("catalog.idx"));
  });

  it("should prune oldest snapshots when count exceeds retention limit", async () => {
    const service = new DatabaseBackupService({
      dbDir,
      backupDir,
      defaultRetentionCount: 2,
    });

    // Create 3 snapshots with slight delays to ensure distinct timestamps
    await service.createSnapshot(2);
    await new Promise((r) => setTimeout(r, 10));
    await service.createSnapshot(2);
    await new Promise((r) => setTimeout(r, 10));
    const finalResult = await service.createSnapshot(2);

    const snapshots = await service.listSnapshots();
    assert.equal(snapshots.length, 2);
    assert.ok(finalResult.prunedSnapshots.length >= 1);

    // Ensure remaining snapshots match the newest ones
    assert.equal(snapshots[snapshots.length - 1]?.path, finalResult.snapshotPath);
  });

  it("should abort snapshot creation and throw when database lock file is present", async () => {
    const lockFile = `${dbDir}.lock`;
    await fs.writeFile(lockFile, "process-lock-pid-1234", "utf-8");

    const service = new DatabaseBackupService({
      dbDir,
      backupDir,
    });

    try {
      await assert.rejects(
        async () => {
          await service.createSnapshot();
        },
        {
          name: "Error",
          message: /Database is currently locked/,
        },
      );
    } finally {
      // Clean up lock file
      await fs.rm(lockFile, { force: true });
    }
  });

  it("should fail gracefully when database directory does not exist", async () => {
    const invalidService = new DatabaseBackupService({
      dbDir: path.join(testRoot, "non_existent_db"),
      backupDir,
    });

    await assert.rejects(
      async () => {
        await invalidService.createSnapshot();
      },
      {
        name: "Error",
        message: /Database directory does not exist/,
      },
    );
  });
});
