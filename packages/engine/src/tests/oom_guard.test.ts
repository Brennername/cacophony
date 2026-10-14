import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  OomPredictiveGuard,
  type SystemMemoryPressureReport,
} from "../hardware/OomPredictiveGuard.js";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";

describe("OomPredictiveGuard Suite (T68.6)", () => {
  it("evaluateSystemMemoryPressure detects low memory pressure and fires warning callback (T68.6.2, T68.6.3)", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-mem-"));
    const meminfoPath = path.join(tmpDir, "meminfo");

    try {
      // 1. Simulate low memory (1 GB available, below 1.5 GB threshold)
      fs.writeFileSync(
        meminfoPath,
        `MemTotal:       16384000 kB\nMemFree:          500000 kB\nMemAvailable:    1048576 kB\n`,
      );

      let warningFired = false;
      let reportedAvailable = 0;

      const guard = new OomPredictiveGuard({
        meminfoPath,
        onPressureWarning: (report: SystemMemoryPressureReport) => {
          warningFired = true;
          reportedAvailable = report.memAvailableBytes;
        },
      });

      const report = guard.evaluateSystemMemoryPressure();
      assert.equal(report.isUnderPressure, true, "Should report memory pressure");
      assert.equal(report.memAvailableBytes, 1048576 * 1024);
      assert.equal(warningFired, true, "Warning callback should have fired");
      assert.equal(reportedAvailable, 1048576 * 1024);

      // checkMemoryAvailability should throw
      assert.throws(
        () => guard.checkMemoryAvailability(),
        /Memory availability is below threshold/,
      );

      // 2. Simulate healthy memory (8 GB available)
      fs.writeFileSync(
        meminfoPath,
        `MemTotal:       16384000 kB\nMemFree:         4000000 kB\nMemAvailable:    8388608 kB\n`,
      );

      warningFired = false;
      const healthyReport = guard.evaluateSystemMemoryPressure();
      assert.equal(healthyReport.isUnderPressure, false, "Should not report memory pressure");
      assert.equal(warningFired, false, "Warning callback should not fire under healthy memory");

      // checkMemoryAvailability should not throw
      assert.doesNotThrow(() => guard.checkMemoryAvailability());
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("TaskScheduler.canDispatch halts task dispatch when OOM guard detects pressure (T68.6.4)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-mem-sched-"));
    const meminfoPath = path.join(tmpDir, "meminfo");

    try {
      // Under pressure: 800 MB available
      fs.writeFileSync(
        meminfoPath,
        `MemTotal:       16384000 kB\nMemAvailable:     819200 kB\n`,
      );

      const oomGuard = new OomPredictiveGuard({ meminfoPath });

      const scheduler = new TaskScheduler({
        taskRepo: {} as any,
        stageRepo: {} as any,
        evictionManager: {} as any,
        telemetryProvider: {
          sample: async () => ({
            timestamp: new Date().toISOString(),
            temperatureCelsius: 40,
            gpuClockMhz: 1000,
            memoryClockMhz: 1000,
            gpuPowerWatts: 20,
            gpuVoltageVolts: 0.9,
            vramUsedBytes: 1024,
            vramTotalBytes: 16 * 1024 * 1024 * 1024,
            vramUsedPercent: 1,
          }),
          checkVramHeadroom: async () => true,
        } as any,
        oomGuard,
      });

      const task = {
        id: "task-oom-test",
        title: "Test Task",
        modelAssigned: "qwen2.5-coder:3b",
        priority: "P1",
      } as any;

      const canRun = await scheduler.canDispatch(task);
      assert.equal(canRun, false, "canDispatch should return false when under memory pressure");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("OomPredictiveGuard respects OOM_GUARD_THRESHOLD_MB environment override", () => {
    const origEnv = process.env.OOM_GUARD_THRESHOLD_MB;
    try {
      process.env.OOM_GUARD_THRESHOLD_MB = "512";
      const guard = new OomPredictiveGuard();
      const report = guard.evaluateSystemMemoryPressure();
      assert.equal(
        report.thresholdBytes,
        512 * 1024 * 1024,
        "Threshold should reflect OOM_GUARD_THRESHOLD_MB (512 MB)",
      );
    } finally {
      if (origEnv !== undefined) {
        process.env.OOM_GUARD_THRESHOLD_MB = origEnv;
      } else {
        delete process.env.OOM_GUARD_THRESHOLD_MB;
      }
    }
  });
});
