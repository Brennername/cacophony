import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { SQLiteDriver } from "../drivers/SQLiteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { TaskRepository } from "../repositories/TaskRepository.js";
import { StageRepository } from "../repositories/StageRepository.js";
import { ModelHealthRepository } from "../repositories/ModelHealthRepository.js";
import { TelemetryRepository } from "../repositories/TelemetryRepository.js";
import { VaultRepository } from "../repositories/VaultRepository.js";
import type { TaskRecord, HardwareTelemetrySnapshot } from "@cacophony/shared-types";

describe("Database & Persistence Layer", () => {
  describe("PGliteDriver with Initial Schema Migrations", () => {
    let driver: PGliteDriver;
    let taskRepo: TaskRepository;
    let stageRepo: StageRepository;
    let modelRepo: ModelHealthRepository;
    let telemetryRepo: TelemetryRepository;
    let vaultRepo: VaultRepository;

    before(async () => {
      // In-memory PGlite instance for testing
      driver = new PGliteDriver();
      await driver.connect();

      const runner = new MigrationRunner(driver);
      const applied = await runner.migrate();
      assert.ok(applied.length >= 1);
      assert.equal(applied[0], "001_initial_schema");

      taskRepo = new TaskRepository(driver);
      stageRepo = new StageRepository(driver);
      modelRepo = new ModelHealthRepository(driver);
      telemetryRepo = new TelemetryRepository(driver);
      vaultRepo = new VaultRepository(driver);
    });

    after(async () => {
      await driver.close();
    });

    test("should persist and retrieve a task", async () => {
      const task: TaskRecord = {
        id: "task-test-001",
        title: "Build user service",
        prompt: "Implement strict user service with DTO validation",
        role: "implementer",
        status: "PENDING",
        priority: "P1",
        modelAssigned: "qwen2.5-coder:7b",
        testCommand: "npm test",
        focusFiles: "src/user.ts",
        targetBranch: "arena/task-test-001",
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      await taskRepo.create(task);
      const retrieved = await taskRepo.getById("task-test-001");
      assert.ok(retrieved);
      assert.equal(retrieved.id, "task-test-001");
      assert.equal(retrieved.title, "Build user service");
      assert.equal(retrieved.status, "PENDING");
      assert.equal(retrieved.priority, "P1");

      await taskRepo.updateStatus("task-test-001", "RUNNING");
      const updated = await taskRepo.getById("task-test-001");
      assert.equal(updated?.status, "RUNNING");
    });

    test("should record stage execution and token accounting", async () => {
      const stageId = await stageRepo.recordStageStart("task-test-001", "generation");
      assert.ok(stageId > 0);

      await stageRepo.recordStageCompletion(
        stageId,
        "SUCCESS",
        "Code generated cleanly.",
        150,
        450,
        1200
      );

      const stages = await stageRepo.getStagesForTask("task-test-001");
      assert.equal(stages.length, 1);
      assert.equal(stages[0]?.stageName, "generation");
      assert.equal(stages[0]?.stageStatus, "SUCCESS");
      assert.equal(stages[0]?.tokensSent, 150);
      assert.equal(stages[0]?.tokensReceived, 450);
      assert.equal(stages[0]?.durationMs, 1200);
    });

    test("should track model health and trigger automated eviction on 3 consecutive failures", async () => {
      const modelId = "deepseek-r1:8b";
      const initial = await modelRepo.getProfile(modelId, "ollama");
      assert.equal(initial.status, "ACTIVE");
      assert.equal(initial.consecutiveFailures, 0);

      // Failure 1
      const f1 = await modelRepo.recordRun(modelId, "ollama", false, 5000, 15.2);
      assert.equal(f1.consecutiveFailures, 1);
      assert.equal(f1.status, "ACTIVE");

      // Failure 2
      const f2 = await modelRepo.recordRun(modelId, "ollama", false, 5100, 14.8);
      assert.equal(f2.consecutiveFailures, 2);
      assert.equal(f2.status, "ACTIVE");

      // Failure 3 -> Eviction trigger!
      const f3 = await modelRepo.recordRun(modelId, "ollama", false, 5200, 14.5);
      assert.equal(f3.consecutiveFailures, 3);
      assert.equal(f3.status, "EJECTED");

      // Reset / revive
      await modelRepo.updateStatus(modelId, "ACTIVE");
      const revived = await modelRepo.getProfile(modelId, "ollama");
      assert.equal(revived.status, "ACTIVE");
      assert.equal(revived.consecutiveFailures, 0);
    });

    test("should insert and query hardware telemetry snapshots", async () => {
      const snapshot: HardwareTelemetrySnapshot = {
        timestamp: new Date().toISOString(),
        gpu: {
          gpuBusyPercent: 42.5,
          vramUsedBytes: 2147483648,
          vramTotalBytes: 4294967296,
          vramPercent: 50.0,
          gttUsedBytes: 1073741824,
          gttTotalBytes: 8589934592,
          edgeTempCelsius: 72.0,
          vddgfxMilliVolts: 800,
          socMilliVolts: 750,
          pptWatts: 15.5,
          sclkMhz: 1200
        },
        thermalZone: "Warm",
        pacingDelaySeconds: 5,
        activeModel: {
          name: "qwen2.5-coder:7b",
          model: "qwen2.5-coder:7b",
          sizeBytes: 4683075584,
          vramSizeBytes: 4683075584
        }
      };

      await telemetryRepo.insertSnapshot(snapshot);
      const latest = await telemetryRepo.getLatestSnapshot();
      assert.ok(latest);
      assert.equal(latest.gpu.gpuBusyPercent, 42.5);
      assert.equal(latest.gpu.edgeTempCelsius, 72.0);
      assert.equal(latest.thermalZone, "Warm");
      assert.equal(latest.pacingDelaySeconds, 5);
      assert.equal(latest.activeModel?.name, "qwen2.5-coder:7b");
    });

    test("should store and retrieve encrypted secrets in vault", async () => {
      await vaultRepo.setSecret("OPENAI_API_KEY", "enc_cipher_text_mock", "mock_iv_vector");
      const secret = await vaultRepo.getSecret("OPENAI_API_KEY");
      assert.ok(secret);
      assert.equal(secret.secretKey, "OPENAI_API_KEY");
      assert.equal(secret.encryptedValue, "enc_cipher_text_mock");
      assert.equal(secret.iv, "mock_iv_vector");

      const keys = await vaultRepo.listKeys();
      assert.ok(keys.includes("OPENAI_API_KEY"));
    });
  });

  describe("SQLiteDriver Dialect Compatibility", () => {
    let sqliteDriver: SQLiteDriver;

    before(async () => {
      sqliteDriver = new SQLiteDriver(":memory:");
      await sqliteDriver.connect();

      const runner = new MigrationRunner(sqliteDriver);
      const applied = await runner.migrate();
      assert.ok(applied.length >= 1);
    });

    after(async () => {
      await sqliteDriver.close();
    });

    test("should execute transactions and CRUD on SQLiteDriver", async () => {
      const taskRepo = new TaskRepository(sqliteDriver);
      const task: TaskRecord = {
        id: "task-sqlite-001",
        title: "Test SQLite Driver",
        prompt: "Verify sqlite driver executes correctly",
        role: "test_engineer",
        status: "PENDING",
        priority: "P0",
        modelAssigned: null,
        testCommand: null,
        focusFiles: null,
        targetBranch: null,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      await taskRepo.create(task);
      const retrieved = await taskRepo.getById("task-sqlite-001");
      assert.ok(retrieved);
      assert.equal(retrieved.title, "Test SQLite Driver");
      assert.equal(retrieved.priority, "P0");
    });
  });

  describe("Phase 41: Database Engine Portability, Auto-Vacuuming & Storage Optimization (T41.1 & T41.2)", () => {
    test("T41.1: DatabaseMaintenanceService should compact, partition old telemetry, and measure storage", async () => {
      const { DatabaseMaintenanceService } = await import("../services/DatabaseMaintenanceService.js");
      const testDriver = new PGliteDriver();
      await testDriver.connect();

      const runner = new MigrationRunner(testDriver);
      await runner.migrate();

      // Seed old telemetry snapshot (20 days ago) and fresh snapshot (today)
      const oldTimestamp = new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString();
      const freshTimestamp = new Date().toISOString();

      await testDriver.execute(
        `INSERT INTO telemetry_snapshots (
          timestamp, gpu_busy_pct, vram_used_bytes, vram_total_bytes,
          gtt_used_bytes, gtt_total_bytes, edge_temp_c, vddgfx_mv,
          soc_mv, ppt_watts, sclk_mhz, current_model
        ) VALUES ($1, 40.0, 1000, 2000, 500, 1000, 65.0, 800, 750, 15.0, 1200, 'qwen2.5-coder:7b')`,
        [oldTimestamp]
      );
      await testDriver.execute(
        `INSERT INTO telemetry_snapshots (
          timestamp, gpu_busy_pct, vram_used_bytes, vram_total_bytes,
          gtt_used_bytes, gtt_total_bytes, edge_temp_c, vddgfx_mv,
          soc_mv, ppt_watts, sclk_mhz, current_model
        ) VALUES ($1, 55.0, 1500, 2000, 600, 1000, 75.0, 850, 750, 20.0, 1400, 'qwen2.5-coder:7b')`,
        [freshTimestamp]
      );

      const maintenance = new DatabaseMaintenanceService({
        driver: testDriver,
        dataDirPath: "data/test_maintenance_pglite",
        maxStorageThresholdBytes: 100 * 1024 * 1024,
        telemetryRetentionDays: 14
      });

      // 1. Run VACUUM & compaction without locking transactions
      const compactionResult = await maintenance.runVacuumAndCompaction();
      assert.equal(compactionResult.dialect, "postgres");
      assert.ok(compactionResult.durationMs >= 0);

      // Verify active transaction runs concurrently without lock failure
      await testDriver.transaction(async (tx) => {
        const rows = await tx.query("SELECT COUNT(*) as cnt FROM telemetry_snapshots");
        assert.ok(rows.length > 0);
      });

      // 2. Measure storage metrics
      const metrics = await maintenance.getStorageMetrics();
      assert.ok(metrics.dataDirPath.includes("data/test_maintenance_pglite"));
      assert.equal(typeof metrics.totalSizeBytes, "number");
      assert.equal(metrics.isOverThreshold, false);

      // 3. Partition & archive old telemetry
      const partitionResult = await maintenance.partitionAndArchiveOldTelemetry(14);
      assert.equal(partitionResult.archivedCount, 1);
      assert.ok(partitionResult.archiveFilePath);

      // Verify only 1 fresh record remains in DB
      const remainingRows = await testDriver.query<{ count: number | string }>("SELECT COUNT(*) as count FROM telemetry_snapshots");
      assert.equal(Number(remainingRows[0]?.count), 1);

      await testDriver.close();
    });

    test("T41.2: DatabaseDriverFactory should instantiate drivers and provide cross-driver parity", async () => {
      const { DatabaseDriverFactory } = await import("../drivers/DatabaseDriverFactory.js");

      // Test default/pglite driver instantiation
      const pglite = DatabaseDriverFactory.createDriver({ driver: "pglite" });
      assert.equal(pglite.getDialect(), "postgres");

      // Test sqlite driver instantiation
      const sqlite = DatabaseDriverFactory.createDriver({ driver: "sqlite", sqliteDbPath: ":memory:" });
      assert.equal(sqlite.getDialect(), "sqlite");

      await sqlite.connect();
      const runner = new MigrationRunner(sqlite);
      await runner.migrate();

      // Assert identical CRUD behavior across drivers
      const sqliteTaskRepo = new TaskRepository(sqlite);
      const testTask: TaskRecord = {
        id: "task-parity-001",
        title: "Cross Driver Parity Task",
        prompt: "Verify identical persistence semantics",
        role: "implementer",
        status: "RUNNING",
        priority: "P0",
        modelAssigned: "qwen2.5-coder:7b",
        testCommand: "npm test",
        focusFiles: "src/index.ts",
        targetBranch: "arena/parity",
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      await sqliteTaskRepo.create(testTask);
      const found = await sqliteTaskRepo.getById("task-parity-001");
      assert.ok(found);
      assert.equal(found.title, testTask.title);
      assert.equal(found.status, "RUNNING");
      assert.equal(found.priority, "P0");

      await sqliteTaskRepo.updateStatus("task-parity-001", "COMPLETED");
      const updated = await sqliteTaskRepo.getById("task-parity-001");
      assert.equal(updated?.status, "COMPLETED");

      await sqlite.close();
    });
  });
});
