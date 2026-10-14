import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { AmdVegaTelemetryProvider } from "../telemetry/AmdVegaTelemetryProvider.js";

describe("AmdVegaTelemetryProvider & VRAM Headroom Tests (T68.2.1, T68.2.2)", () => {
  it("enforces static and instance SAFETY_MARGIN_MB of 1024 MB", () => {
    assert.equal(AmdVegaTelemetryProvider.SAFETY_MARGIN_MB, 1024);

    const provider = new AmdVegaTelemetryProvider("/nonexistent/drm", "/nonexistent/hwmon");
    assert.equal(provider.SAFETY_MARGIN_MB, 1024);
  });

  it("evaluates checkVramHeadroom with sysfs DRM mem_info nodes and safety margin", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-vram-test-"));
    const cardDir = path.join(tempDir, "card0", "device");
    fs.mkdirSync(cardDir, { recursive: true });

    try {
      // Setup mock DRM sysfs files: 8192 MB total, 2048 MB used -> 6144 MB free
      const totalBytes = 8192 * 1024 * 1024;
      const usedBytes = 2048 * 1024 * 1024;
      fs.writeFileSync(path.join(cardDir, "mem_info_vram_total"), `${totalBytes}\n`);
      fs.writeFileSync(path.join(cardDir, "mem_info_vram_used"), `${usedBytes}\n`);

      const provider = new AmdVegaTelemetryProvider(tempDir, "/nonexistent/hwmon");

      // 5000 MB required + 1024 MB safety margin = 6024 MB <= 6144 MB free -> should return true
      const fits = provider.checkVramHeadroom(5000);
      assert.equal(fits, true, "5000 MB should fit within 6144 MB free VRAM with 1024 MB safety margin");

      // 5200 MB required + 1024 MB safety margin = 6224 MB > 6144 MB free -> should return false
      const overflows = provider.checkVramHeadroom(5200);
      assert.equal(overflows, false, "5200 MB should be rejected as 6224 MB exceeds 6144 MB free VRAM");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("retrieves exact byte counts via getVramMetrics", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-vram-metrics-"));
    const cardDir = path.join(tempDir, "card0", "device");
    fs.mkdirSync(cardDir, { recursive: true });

    try {
      const totalBytes = 4294967296; // 4 GB
      const usedBytes = 1073741824;  // 1 GB
      fs.writeFileSync(path.join(cardDir, "mem_info_vram_total"), `${totalBytes}\n`);
      fs.writeFileSync(path.join(cardDir, "mem_info_vram_used"), `${usedBytes}\n`);

      const provider = new AmdVegaTelemetryProvider(tempDir, "/nonexistent/hwmon");
      const metrics = await provider.getVramMetrics();

      assert.equal(metrics.totalBytes, totalBytes);
      assert.equal(metrics.usedBytes, usedBytes);
      assert.equal(metrics.freeBytes, totalBytes - usedBytes);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("gracefully allows headroom check when DRM device is not present", () => {
    const provider = new AmdVegaTelemetryProvider("/nonexistent/drm", "/nonexistent/hwmon");
    const allowed = provider.checkVramHeadroom(8000);
    assert.equal(allowed, true, "Should gracefully allow execution in non-sysfs test environments");
  });
});
