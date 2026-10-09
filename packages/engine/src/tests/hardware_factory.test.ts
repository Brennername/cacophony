import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { HardwareProviderFactory } from "../telemetry/HardwareProviderFactory.js";
import { CpuFallbackProvider } from "../telemetry/CpuFallbackProvider.js";

describe("HardwareProviderFactory & CpuFallbackProvider Suite (T83.1)", () => {
  it("detects APPLE_SILICON on macOS arm64 host", async () => {
    const factory = new HardwareProviderFactory({
      platform: "darwin",
      arch: "arm64",
      commandRunner: () => "Apple M2 Pro",
    });

    const category = await factory.detectCategory();
    assert.equal(category, "APPLE_SILICON");

    const provider = await factory.createProvider();
    assert.equal(provider.getName(), "AppleSiliconProvider");
  });

  it("detects NVIDIA_CUDA when nvidia-smi is available", async () => {
    const factory = new HardwareProviderFactory({
      platform: "linux",
      arch: "x86_64",
      commandRunner: (cmd: string) => {
        if (cmd.includes("nvidia-smi -L")) {
          return "GPU 0: NVIDIA GeForce RTX 3080 (UUID: GPU-1234)";
        }
        return "";
      },
    });

    const category = await factory.detectCategory();
    assert.equal(category, "NVIDIA_CUDA");

    const provider = await factory.createProvider();
    assert.equal(provider.getName(), "NvidiaNvmlProvider");
  });

  it("detects AMD_APU_VEGA when sysfs DRM vendor matches 0x1002", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-drm-amd-"));
    try {
      const cardDir = path.join(tempDir, "card0", "device");
      fs.mkdirSync(cardDir, { recursive: true });
      fs.writeFileSync(path.join(cardDir, "vendor"), "0x1002\n");

      const factory = new HardwareProviderFactory({
        platform: "linux",
        arch: "x86_64",
        sysfsDrmPath: tempDir,
        commandRunner: () => {
          throw new Error("Command not found");
        },
      });

      const category = await factory.detectCategory();
      assert.equal(category, "AMD_APU_VEGA");

      const provider = await factory.createProvider();
      assert.equal(provider.getName(), "AmdVegaTelemetryProvider");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("falls back to CPU_FALLBACK when no GPU accelerator exists", async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "cacophony-empty-drm-"));
    try {
      const factory = new HardwareProviderFactory({
        platform: "linux",
        arch: "x86_64",
        sysfsDrmPath: emptyDir,
        kfdPath: path.join(emptyDir, "nonexistent-kfd"),
        commandRunner: () => {
          throw new Error("Command not found");
        },
      });

      const category = await factory.detectCategory();
      assert.equal(category, "CPU_FALLBACK");

      const provider = await factory.createProvider();
      assert.equal(provider.getName(), "CpuFallbackProvider");
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("samples normalized metrics via CpuFallbackProvider", async () => {
    const cpuProvider = new CpuFallbackProvider();
    assert.equal(cpuProvider.getName(), "CpuFallbackProvider");
    assert.equal(cpuProvider.getCategory(), "CPU_FALLBACK");
    assert.equal(await cpuProvider.isAvailable(), true);

    const metrics = await cpuProvider.sample();
    assert(metrics.vramTotalBytes > 0, "Expected positive total memory");
    assert(metrics.vramPercent >= 0 && metrics.vramPercent <= 100, "VRAM percent within range");
    assert(metrics.gpuBusyPercent >= 0 && metrics.gpuBusyPercent <= 100, "CPU load within range");
    assert.equal(metrics.edgeTempCelsius, 45.0);

    const vram = await cpuProvider.getVramMetrics();
    assert(vram.totalBytes > 0);
    assert(vram.freeBytes >= 0);

    const thermal = await cpuProvider.getThermalMetrics();
    assert.equal(thermal.isThrottled, false);
  });
});
