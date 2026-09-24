import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { TelemetryRepository } from "@cacophony/db";
import { TaskTelemetryCorrelationRepository } from "@cacophony/db";
import { PGliteDriver } from "@cacophony/db";
import { MigrationRunner } from "@cacophony/db";
import { TelemetryPoller } from "../TelemetryPoller.js";
import { PrometheusMetricsExporter } from "../PrometheusMetricsExporter.js";
import { TelemetryCorrelationService } from "../TelemetryCorrelationService.js";
import type { IHardwareTelemetryProvider } from "../IHardwareTelemetryProvider.js";
import type { GpuMetrics } from "@cacophony/shared-types";

class MockTelemetryProvider implements IHardwareTelemetryProvider {
  public getName(): string {
    return "MockTelemetryProvider";
  }
  public async isAvailable(): Promise<boolean> {
    return true;
  }
  public async sample(): Promise<GpuMetrics> {
    return {
      gpuBusyPercent: 42,
      vramUsedBytes: 4294967296,
      vramTotalBytes: 17179869184,
      vramPercent: 25,
      gttUsedBytes: 1073741824,
      gttTotalBytes: 17179869184,
      edgeTempCelsius: 64,
      vddgfxMilliVolts: 1320,
      socMilliVolts: 943,
      pptWatts: 35,
      sclkMhz: 2100,
      mclkMhz: 1600
    };
  }
}

describe("Phase 35: Hardware Telemetry Capture, Prometheus Exporter & Success Analytics", () => {
  it("T35.1: TelemetryPoller should store sliding window circular buffer in memory", async () => {
    const provider = new MockTelemetryProvider();
    const poller = new TelemetryPoller({ provider, pollIntervalMs: 50 });

    await poller.pollOnce();
    await poller.pollOnce();
    assert.equal(poller.getRecentBuffer().length, 2);
    assert.equal(poller.getLatest()?.gpu.edgeTempCelsius, 64);
  });

  it("T35.1: TelemetryRepository should prune older snapshots and compute aggregated history", async () => {
    const driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();

    const repo = new TelemetryRepository(driver);
    const provider = new MockTelemetryProvider();
    const poller = new TelemetryPoller({ provider, repository: repo });

    await poller.pollOnce();
    await poller.pollOnce();

    const history = await repo.getAggregatedHistory(new Date(Date.now() - 3600_000).toISOString());
    assert.ok(history.count >= 2);
    assert.equal(history.avgGpuBusy, 42);
    assert.equal(history.peakTempC, 64);

    const pruned = await repo.pruneOlderThan(new Date(Date.now() + 10_000).toISOString());
    assert.ok(pruned >= 2);

    await driver.close();
  });

  it("T35.2: TaskTelemetryCorrelationRepository and TelemetryCorrelationService", async () => {
    const driver = new PGliteDriver();
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();

    const corrRepo = new TaskTelemetryCorrelationRepository(driver);
    await corrRepo.recordCorrelation({
      id: "corr-1",
      taskId: "task-1",
      modelId: "qwen2.5-coder:3b",
      avgGpuBusy: 55,
      peakEdgeTemp: 68,
      totalTokens: 1200,
      avgTokensPerSec: 38.5,
      thermalThrottleEvents: 0,
      durationMs: 31000,
      createdAt: new Date().toISOString()
    });

    const service = new TelemetryCorrelationService(corrRepo);
    const scores = await service.getModelEfficiencyScores();
    assert.equal(scores.length, 1);
    assert.equal(scores[0]?.family, "qwen");
    assert.ok(scores[0]?.thermalPacingScore ?? 0 > 30);

    const suggestion = await service.suggestCoolerModel("deepseek-r1:8b");
    assert.equal(suggestion, "qwen2.5-coder:3b");

    await driver.close();
  });

  it("T35.3: PrometheusMetricsExporter should output valid OpenMetrics gauges and counters", async () => {
    const provider = new MockTelemetryProvider();
    const poller = new TelemetryPoller({ provider });
    await poller.pollOnce();

    const exporter = new PrometheusMetricsExporter({ telemetryPoller: poller });
    const text = await exporter.getMetricsText();

    assert.ok(text.includes("# TYPE cacophony_gpu_busy_percent gauge"));
    assert.ok(text.includes("cacophony_gpu_busy_percent 42"));
    assert.ok(text.includes("cacophony_power_watts 35"));
    assert.ok(text.includes("cacophony_vram_clock_mhz 1600"));
    assert.ok(text.includes("cacophony_tasks_total"));
  });
});
