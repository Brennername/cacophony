import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";
import { FallbackTelemetryProvider } from "../telemetry/FallbackTelemetryProvider.js";
import { AmdVegaTelemetryProvider } from "../telemetry/AmdVegaTelemetryProvider.js";
import { TelemetryPoller } from "../telemetry/TelemetryPoller.js";

describe("Hardware Diagnostics & Telemetry Module", () => {
  describe("ThermalGovernor Thresholds", () => {
    const governor = new ThermalGovernor(70, 80, 90);

    test("should evaluate Nominal zone below 70C", () => {
      const res = governor.evaluate(65.5);
      assert.equal(res.zone, "Nominal");
      assert.equal(res.pacingDelaySeconds, 0);
    });

    test("should evaluate Warm zone between 70C and 80C", () => {
      const res = governor.evaluate(74.0);
      assert.equal(res.zone, "Warm");
      assert.equal(res.pacingDelaySeconds, 5);
    });

    test("should evaluate Elevated zone between 80C and 90C", () => {
      const res = governor.evaluate(85.2);
      assert.equal(res.zone, "Elevated");
      assert.equal(res.pacingDelaySeconds, 15);
    });

    test("should evaluate Danger zone at or above 90C", () => {
      const res = governor.evaluate(92.0);
      assert.equal(res.zone, "Danger");
      assert.equal(res.pacingDelaySeconds, 10);
    });
  });

  describe("FallbackTelemetryProvider", () => {
    test("should emit valid normalized metrics in simulated mode", async () => {
      const provider = new FallbackTelemetryProvider(true);
      const metrics = await provider.sample();

      assert.equal(typeof metrics.gpuBusyPercent, "number");
      assert.equal(typeof metrics.vramUsedBytes, "number");
      assert.equal(typeof metrics.vramTotalBytes, "number");
      assert.equal(typeof metrics.vramPercent, "number");
      assert.equal(typeof metrics.edgeTempCelsius, "number");
      assert.ok(metrics.edgeTempCelsius > 0);
      assert.ok(metrics.vramTotalBytes > 0);
    });
  });

  describe("AmdVegaTelemetryProvider with Sysfs Fixtures", () => {
    test("should parse sysfs hwmon and drm nodes correctly", async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-telemetry-test-"));
      const hwmonBase = path.join(tempDir, "hwmon");
      const drmBase = path.join(tempDir, "drm");

      // Setup mock amdgpu hwmon controller
      const mockHwmon2 = path.join(hwmonBase, "hwmon2");
      fs.mkdirSync(mockHwmon2, { recursive: true });
      fs.writeFileSync(path.join(mockHwmon2, "name"), "amdgpu\n");
      fs.writeFileSync(path.join(mockHwmon2, "temp1_input"), "72500\n"); // 72.5°C
      fs.writeFileSync(path.join(mockHwmon2, "in0_input"), "850\n");     // 850 mV
      fs.writeFileSync(path.join(mockHwmon2, "in1_input"), "700\n");     // 700 mV
      fs.writeFileSync(path.join(mockHwmon2, "power1_input"), "14250000\n"); // 14.25 W
      fs.writeFileSync(path.join(mockHwmon2, "freq1_input"), "1200000000\n"); // 1200 MHz

      // Setup mock card1 DRM device
      const mockDrmCard1 = path.join(drmBase, "card1", "device");
      fs.mkdirSync(mockDrmCard1, { recursive: true });
      fs.writeFileSync(path.join(mockDrmCard1, "gpu_busy_percent"), "65\n");
      fs.writeFileSync(path.join(mockDrmCard1, "mem_info_vram_used"), "2147483648\n"); // 2 GB
      fs.writeFileSync(path.join(mockDrmCard1, "mem_info_vram_total"), "4294967296\n"); // 4 GB
      fs.writeFileSync(path.join(mockDrmCard1, "mem_info_gtt_used"), "1073741824\n");
      fs.writeFileSync(path.join(mockDrmCard1, "mem_info_gtt_total"), "8589934592\n");

      const provider = new AmdVegaTelemetryProvider(drmBase, hwmonBase);
      assert.equal(await provider.isAvailable(), true);

      const metrics = await provider.sample();
      assert.equal(metrics.edgeTempCelsius, 72.5);
      assert.equal(metrics.vddgfxMilliVolts, 850);
      assert.equal(metrics.socMilliVolts, 700);
      assert.equal(metrics.pptWatts, 14.25);
      assert.equal(metrics.sclkMhz, 1200);
      assert.equal(metrics.gpuBusyPercent, 65);
      assert.equal(metrics.vramUsedBytes, 2147483648);
      assert.equal(metrics.vramTotalBytes, 4294967296);
      assert.equal(metrics.vramPercent, 50.0);
      assert.equal(metrics.gttUsedBytes, 1073741824);

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe("TelemetryPoller", () => {
    test("should poll telemetry provider and notify subscribers", async () => {
      const provider = new FallbackTelemetryProvider(true);
      const poller = new TelemetryPoller({
        provider,
        pollIntervalMs: 50,
        ollamaBaseUrl: "http://127.0.0.1:9999" // Unused in this test
      });

      let receivedSnapshot = false;
      const unsubscribe = poller.subscribe((snapshot) => {
        if (snapshot.gpu.edgeTempCelsius > 0) {
          receivedSnapshot = true;
        }
      });

      const snapshot = await poller.pollOnce();
      assert.ok(snapshot);
      assert.equal(receivedSnapshot, true);
      assert.equal(poller.getLatest()?.gpu.edgeTempCelsius, snapshot.gpu.edgeTempCelsius);

      unsubscribe();
      poller.stop();
    });
  });
});
