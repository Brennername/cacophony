import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { AmdVegaTelemetryProvider } from "../telemetry/AmdVegaTelemetryProvider.js";

describe("AmdVegaTelemetryProvider Unit Test Suite (T102.2.1)", () => {
  let tempBaseDir: string;
  let mockDrmDir: string;
  let mockHwmonDir: string;
  let amdgpuHwmonDir: string;
  let card0DeviceDir: string;

  before(() => {
    // Scaffold mock sysfs hierarchy to test Linux kernel sysfs harvesting safely in any environment
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "amd-vega-telemetry-test-"));
    mockDrmDir = path.join(tempBaseDir, "drm");
    mockHwmonDir = path.join(tempBaseDir, "hwmon");

    fs.mkdirSync(mockDrmDir, { recursive: true });
    fs.mkdirSync(mockHwmonDir, { recursive: true });

    // Mock hwmon0 controller with name 'amdgpu'
    amdgpuHwmonDir = path.join(mockHwmonDir, "hwmon0");
    fs.mkdirSync(amdgpuHwmonDir, { recursive: true });
    fs.writeFileSync(path.join(amdgpuHwmonDir, "name"), "amdgpu\n", "utf-8");
    fs.writeFileSync(path.join(amdgpuHwmonDir, "temp1_input"), "54000\n", "utf-8"); // 54.0 C
    fs.writeFileSync(path.join(amdgpuHwmonDir, "in0_input"), "850\n", "utf-8"); // 850 mV
    fs.writeFileSync(path.join(amdgpuHwmonDir, "in1_input"), "900\n", "utf-8"); // 900 mV
    fs.writeFileSync(path.join(amdgpuHwmonDir, "power1_input"), "25000000\n", "utf-8"); // 25.00 W
    fs.writeFileSync(path.join(amdgpuHwmonDir, "freq1_input"), "1800000000\n", "utf-8"); // 1800 MHz

    // Mock DRM card0 device directory
    card0DeviceDir = path.join(mockDrmDir, "card0", "device");
    fs.mkdirSync(card0DeviceDir, { recursive: true });
    fs.writeFileSync(path.join(card0DeviceDir, "gpu_busy_percent"), "42\n", "utf-8");
    fs.writeFileSync(
      path.join(card0DeviceDir, "mem_info_vram_total"),
      (8192 * 1024 * 1024).toString() + "\n",
      "utf-8",
    );
    fs.writeFileSync(
      path.join(card0DeviceDir, "mem_info_vram_used"),
      (2048 * 1024 * 1024).toString() + "\n",
      "utf-8",
    );
    fs.writeFileSync(
      path.join(card0DeviceDir, "mem_info_gtt_total"),
      (16384 * 1024 * 1024).toString() + "\n",
      "utf-8",
    );
    fs.writeFileSync(
      path.join(card0DeviceDir, "mem_info_gtt_used"),
      (1024 * 1024 * 1024).toString() + "\n",
      "utf-8",
    );
    fs.writeFileSync(
      path.join(card0DeviceDir, "pp_dpm_mclk"),
      "0: 400Mhz\n1: 800Mhz\n2: 1600Mhz *\n",
      "utf-8",
    );
  });

  after(() => {
    // Clean up temporary sysfs tree
    if (tempBaseDir && fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it("should report provider identity and APU hardware category", () => {
    const provider = new AmdVegaTelemetryProvider(mockDrmDir, mockHwmonDir);
    assert.strictEqual(provider.getName(), "AmdVegaTelemetryProvider");
    assert.strictEqual(provider.getCategory(), "AMD_APU_VEGA");
    assert.strictEqual(provider.SAFETY_MARGIN_MB, 1024);
  });

  it("should detect availability when sysfs DRM or hwmon nodes exist", async () => {
    const provider = new AmdVegaTelemetryProvider(mockDrmDir, mockHwmonDir);
    const available = await provider.isAvailable();
    assert.strictEqual(available, true);
  });

  it("should return false for availability when sysfs paths do not exist", async () => {
    const nonExistentDrm = path.join(tempBaseDir, "non_existent_drm");
    const nonExistentHwmon = path.join(tempBaseDir, "non_existent_hwmon");
    const provider = new AmdVegaTelemetryProvider(nonExistentDrm, nonExistentHwmon);
    const available = await provider.isAvailable();
    assert.strictEqual(available, false);
  });

  it("should parse accurate VRAM metrics from sysfs mem_info nodes", async () => {
    const provider = new AmdVegaTelemetryProvider(mockDrmDir, mockHwmonDir);
    const metrics = await provider.getVramMetrics();

    assert.strictEqual(metrics.totalBytes, 8192 * 1024 * 1024);
    assert.strictEqual(metrics.usedBytes, 2048 * 1024 * 1024);
    assert.strictEqual(metrics.freeBytes, 6144 * 1024 * 1024);
  });

  it("should evaluate VRAM headroom with 1024MB safety buffer correctly", () => {
    const provider = new AmdVegaTelemetryProvider(mockDrmDir, mockHwmonDir);

    // Free VRAM is 6144 MB. Required with 1024 MB buffer:
    // Requesting 4000 MB -> total required 5024 MB <= 6144 MB -> true
    assert.strictEqual(provider.checkVramHeadroom(4000), true);

    // Requesting 5120 MB -> total required 6144 MB <= 6144 MB -> true
    assert.strictEqual(provider.checkVramHeadroom(5120), true);

    // Requesting 5200 MB -> total required 6224 MB > 6144 MB -> false
    assert.strictEqual(provider.checkVramHeadroom(5200), false);
  });

  it("should return true for headroom check in non-sysfs CI environments", () => {
    const emptyDrm = path.join(tempBaseDir, "empty_drm");
    fs.mkdirSync(emptyDrm, { recursive: true });
    const provider = new AmdVegaTelemetryProvider(emptyDrm, mockHwmonDir);

    // When DRM is absent, checkVramHeadroom should not block executions
    assert.strictEqual(provider.checkVramHeadroom(4000), true);
  });

  it("should sample comprehensive GPU and APU telemetry from sysfs", async () => {
    const provider = new AmdVegaTelemetryProvider(mockDrmDir, mockHwmonDir);
    const sample = await provider.sample();

    assert.strictEqual(sample.edgeTempCelsius, 54.0);
    assert.strictEqual(sample.vddgfxMilliVolts, 850);
    assert.strictEqual(sample.socMilliVolts, 900);
    assert.strictEqual(sample.pptWatts, 25.0);
    assert.strictEqual(sample.sclkMhz, 1800);
    assert.strictEqual(sample.gpuBusyPercent, 42);
    assert.strictEqual(sample.vramUsedBytes, 2048 * 1024 * 1024);
    assert.strictEqual(sample.vramTotalBytes, 8192 * 1024 * 1024);
    assert.strictEqual(sample.vramPercent, 25.0);
    assert.strictEqual(sample.gttUsedBytes, 1024 * 1024 * 1024);
    assert.strictEqual(sample.gttTotalBytes, 16384 * 1024 * 1024);
    assert.strictEqual(sample.mclkMhz, 1600);
  });

  it("should handle missing sensor files gracefully and return zero fallbacks", async () => {
    const partialHwmon = path.join(tempBaseDir, "partial_hwmon");
    const partialDrm = path.join(tempBaseDir, "partial_drm");
    const partialDevice = path.join(partialDrm, "card0", "device");

    fs.mkdirSync(partialDevice, { recursive: true });
    // Write mem_info_vram_total so device is discovered, plus gpu_busy_percent, but no other memory or hwmon files
    fs.writeFileSync(path.join(partialDevice, "mem_info_vram_total"), "0\n", "utf-8");
    fs.writeFileSync(path.join(partialDevice, "gpu_busy_percent"), "15\n", "utf-8");

    const provider = new AmdVegaTelemetryProvider(partialDrm, partialHwmon);
    const sample = await provider.sample();

    assert.strictEqual(sample.gpuBusyPercent, 15);
    assert.strictEqual(sample.edgeTempCelsius, 0.0);
    assert.strictEqual(sample.vramUsedBytes, 0);
    assert.strictEqual(sample.vramTotalBytes, 0);
    assert.strictEqual(sample.vramPercent, 0.0);
  });
});
