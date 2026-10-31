import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PGliteDriver } from "../drivers/PGliteDriver.js";
import { MigrationRunner } from "../migrations/MigrationRunner.js";
import { TelemetryRepository } from "../repositories/TelemetryRepository.js";
import type { HardwareTelemetrySnapshot } from "@cacophony/shared-types";

describe("TelemetryRepository", () => {
  let driver: PGliteDriver;
  let repo: TelemetryRepository;

  beforeEach(async () => {
    driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    repo = new TelemetryRepository(driver);
  });

  afterEach(async () => {
    await driver.close();
  });

  test("should insert snapshot and retrieve as latest snapshot", async () => {
    const snapshot: HardwareTelemetrySnapshot = {
      timestamp: new Date().toISOString(),
      gpu: {
        gpuBusyPercent: 82.5,
        vramUsedBytes: 6442450944,
        vramTotalBytes: 8589934592,
        vramPercent: 75.0,
        gttUsedBytes: 2147483648,
        gttTotalBytes: 17179869184,
        edgeTempCelsius: 72.0,
        vddgfxMilliVolts: 950,
        socMilliVolts: 900,
        pptWatts: 45.5,
        sclkMhz: 1600,
      },
      thermalZone: "Warm",
      pacingDelaySeconds: 5,
      activeModel: {
        name: "qwen2.5-coder:14b",
        model: "qwen2.5-coder:14b",
        sizeBytes: 9000000000,
        vramSizeBytes: 6442450944,
      },
    };

    await repo.insertSnapshot(snapshot);

    const latest = await repo.getLatestSnapshot();
    assert.ok(latest);
    assert.equal(latest.gpu.gpuBusyPercent, 82.5);
    assert.equal(latest.gpu.edgeTempCelsius, 72.0);
    assert.equal(latest.gpu.pptWatts, 45.5);
    assert.equal(latest.thermalZone, "Warm");
    assert.equal(latest.activeModel?.name, "qwen2.5-coder:14b");
  });

  test("should retrieve recent snapshots in chronological order", async () => {
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
      await repo.insertSnapshot({
        timestamp: new Date(now + i * 1000).toISOString(),
        gpu: {
          gpuBusyPercent: 50 + i * 10,
          vramUsedBytes: 1000,
          vramTotalBytes: 8000,
          vramPercent: 12.5,
          gttUsedBytes: 500,
          gttTotalBytes: 4000,
          edgeTempCelsius: 55 + i * 5,
          vddgfxMilliVolts: 800,
          socMilliVolts: 800,
          pptWatts: 30 + i * 5,
          sclkMhz: 1200,
        },
        thermalZone: "Nominal",
        pacingDelaySeconds: 0,
        activeModel: null,
      });
    }

    const recent = await repo.getRecentSnapshots(10);
    assert.equal(recent.length, 3);
    assert.equal(recent[0]!.gpu.gpuBusyPercent, 50);
    assert.equal(recent[2]!.gpu.gpuBusyPercent, 70);
  });

  test("should aggregate history metrics over time window", async () => {
    const cutoff = new Date(Date.now() - 5000).toISOString();
    await repo.insertSnapshot({
      timestamp: new Date(Date.now() - 2000).toISOString(),
      gpu: {
        gpuBusyPercent: 40,
        vramUsedBytes: 1000,
        vramTotalBytes: 8000,
        vramPercent: 12.5,
        gttUsedBytes: 500,
        gttTotalBytes: 4000,
        edgeTempCelsius: 60,
        vddgfxMilliVolts: 800,
        socMilliVolts: 800,
        pptWatts: 30,
        sclkMhz: 1200,
      },
      thermalZone: "Nominal",
      pacingDelaySeconds: 0,
      activeModel: null,
    });

    await repo.insertSnapshot({
      timestamp: new Date().toISOString(),
      gpu: {
        gpuBusyPercent: 80,
        vramUsedBytes: 2000,
        vramTotalBytes: 8000,
        vramPercent: 25.0,
        gttUsedBytes: 500,
        gttTotalBytes: 4000,
        edgeTempCelsius: 80,
        vddgfxMilliVolts: 900,
        socMilliVolts: 900,
        pptWatts: 50,
        sclkMhz: 1500,
      },
      thermalZone: "Elevated",
      pacingDelaySeconds: 15,
      activeModel: null,
    });

    const agg = await repo.getAggregatedHistory(cutoff);
    assert.equal(agg.count, 2);
    assert.equal(agg.avgGpuBusy, 60.0);
    assert.equal(agg.peakGpuBusy, 80);
    assert.equal(agg.avgTempC, 70.0);
    assert.equal(agg.peakTempC, 80);
    assert.equal(agg.avgPowerWatts, 40.0);
    assert.equal(agg.peakPowerWatts, 50);
  });

  test("should prune snapshots older than cutoff", async () => {
    const oldTimestamp = new Date(Date.now() - 100000).toISOString();
    const newTimestamp = new Date().toISOString();

    await repo.insertSnapshot({
      timestamp: oldTimestamp,
      gpu: {
        gpuBusyPercent: 10,
        vramUsedBytes: 100,
        vramTotalBytes: 1000,
        vramPercent: 10,
        gttUsedBytes: 100,
        gttTotalBytes: 1000,
        edgeTempCelsius: 40,
        vddgfxMilliVolts: 700,
        socMilliVolts: 700,
        pptWatts: 15,
        sclkMhz: 800,
      },
      thermalZone: "Nominal",
      pacingDelaySeconds: 0,
      activeModel: null,
    });

    await repo.insertSnapshot({
      timestamp: newTimestamp,
      gpu: {
        gpuBusyPercent: 20,
        vramUsedBytes: 200,
        vramTotalBytes: 1000,
        vramPercent: 20,
        gttUsedBytes: 100,
        gttTotalBytes: 1000,
        edgeTempCelsius: 45,
        vddgfxMilliVolts: 700,
        socMilliVolts: 700,
        pptWatts: 18,
        sclkMhz: 800,
      },
      thermalZone: "Nominal",
      pacingDelaySeconds: 0,
      activeModel: null,
    });

    const pruned = await repo.pruneOlderThan(new Date(Date.now() - 50000).toISOString());
    assert.equal(pruned, 1);

    const remaining = await repo.getRecentSnapshots(10);
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0]!.gpu.gpuBusyPercent, 20);
  });
});
