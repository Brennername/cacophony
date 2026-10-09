import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NvidiaNvmlProvider } from "../telemetry/NvidiaNvmlProvider.js";

describe("NvidiaNvmlProvider Suite (T83.2)", () => {
  const mockMultiGpuCsv = [
    "0, NVIDIA GeForce RTX 3090, 24576, 8192, 16384, 62, 220.5, 45",
    "1, NVIDIA GeForce RTX 3080, 10240, 2048, 8192, 55, 150.0, 30",
  ].join("\n");

  it("parses multi-GPU CSV output and aggregates metrics", async () => {
    const provider = new NvidiaNvmlProvider(() => mockMultiGpuCsv);

    assert.equal(provider.getName(), "NvidiaNvmlProvider");
    assert.equal(provider.getCategory(), "NVIDIA_CUDA");

    const devices = await provider.listDevices();
    assert.equal(devices.length, 2);

    assert.equal(devices[0]!.name, "NVIDIA GeForce RTX 3090");
    assert.equal(devices[0]!.memoryTotalBytes, 24576 * 1024 * 1024);
    assert.equal(devices[0]!.temperatureCelsius, 62);
    assert.equal(devices[0]!.powerDrawWatts, 220.5);
    assert.equal(devices[0]!.smUtilizationPercent, 45);

    assert.equal(devices[1]!.name, "NVIDIA GeForce RTX 3080");
    assert.equal(devices[1]!.memoryTotalBytes, 10240 * 1024 * 1024);

    const sample = await provider.sample();
    const expectedTotalVram = (24576 + 10240) * 1024 * 1024;
    const expectedUsedVram = (8192 + 2048) * 1024 * 1024;
    assert.equal(sample.vramTotalBytes, expectedTotalVram);
    assert.equal(sample.vramUsedBytes, expectedUsedVram);
    assert.equal(sample.edgeTempCelsius, 62); // max temp
    assert.equal(sample.pptWatts, 370.5); // sum of power
    assert.equal(sample.gpuBusyPercent, 45); // max SM util
  });

  it("calculates VRAM and thermal metrics correctly", async () => {
    const provider = new NvidiaNvmlProvider(() => mockMultiGpuCsv);

    const vram = await provider.getVramMetrics();
    assert.equal(vram.totalBytes, (24576 + 10240) * 1024 * 1024);
    assert.equal(vram.usedBytes, (8192 + 2048) * 1024 * 1024);
    assert.equal(vram.freeBytes, (16384 + 8192) * 1024 * 1024);

    const thermal = await provider.getThermalMetrics();
    assert.equal(thermal.temperatureCelsius, 62);
    assert.equal(thermal.isThrottled, false);
  });

  it("handles nvidia-smi command failures gracefully", async () => {
    const provider = new NvidiaNvmlProvider(() => {
      throw new Error("nvidia-smi: command not found");
    });

    const isAvail = await provider.isAvailable();
    assert.equal(isAvail, false);

    await assert.rejects(
      async () => provider.sample(),
      /Failed to query NVIDIA GPU devices/
    );
  });
});
