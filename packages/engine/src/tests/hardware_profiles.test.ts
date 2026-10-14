import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DiscreteGpuHardwareProfile,
  ApuHardwareProfile,
  TpuHardwareProfile,
  CpuHardwareProfile,
  createHardwareProfile,
} from "../hardware/ComputeHardwareProfile.js";

describe("Compute Hardware Profiles (T71.2.1)", () => {
  it("should evaluate discrete GPU offload capacity and safety headroom", () => {
    const gpu = new DiscreteGpuHardwareProfile({
      name: "NVIDIA RTX 4090",
      totalVramMb: 24576,
      availableVramMb: 8192,
      computeUnits: 128,
      supportsFlashAttention: true,
    });

    assert.equal(gpu.type, "discrete_gpu");
    assert.equal(gpu.supportsFlashAttention, true);
    assert.equal(gpu.quantizationPreference, "q4_k_m");

    // 8192 available with 512 safety buffer: can fit 7000 MB, cannot fit 8000 MB
    assert.equal(gpu.canOffloadModel(7000), true);
    assert.equal(gpu.canOffloadModel(8000), false);
    assert.equal(gpu.getThrottleReason(), null);

    // Low VRAM condition (< 1024 MB)
    const lowVramGpu = new DiscreteGpuHardwareProfile({
      totalVramMb: 24576,
      availableVramMb: 800,
    });
    assert.ok(lowVramGpu.getThrottleReason()?.includes("Critical VRAM exhaustion"));
  });

  it("should evaluate APU unified memory constraints and system reserve", () => {
    const apu = new ApuHardwareProfile({
      name: "AMD Ryzen AI 9 HX 370",
      totalVramMb: 32768,
      availableVramMb: 6144,
      computeUnits: 16,
    });

    assert.equal(apu.type, "apu");
    assert.equal(apu.supportsFlashAttention, false);
    // 6144 available with 1024 system headroom: can fit 5000 MB, cannot fit 5500 MB
    assert.equal(apu.canOffloadModel(5000), true);
    assert.equal(apu.canOffloadModel(5500), false);
    assert.equal(apu.getThrottleReason(), null);

    const constrainedApu = new ApuHardwareProfile({
      totalVramMb: 16384,
      availableVramMb: 1500,
    });
    assert.ok(constrainedApu.getThrottleReason()?.includes("Unified system memory constrained"));
  });

  it("should evaluate TPU hardware profile with fp16 quantization preference", () => {
    const tpu = new TpuHardwareProfile({
      name: "Google Cloud TPU v5e",
      totalVramMb: 16384,
      availableVramMb: 16384,
      computeUnits: 4,
    });

    assert.equal(tpu.type, "tpu");
    assert.equal(tpu.supportsFlashAttention, true);
    assert.equal(tpu.quantizationPreference, "fp16");
    assert.equal(tpu.canOffloadModel(16000), true);
    assert.equal(tpu.canOffloadModel(17000), false);
    assert.equal(tpu.getThrottleReason(), null);
  });

  it("should evaluate CPU hardware profile with memory reserve and latency warning", () => {
    const cpu = new CpuHardwareProfile({
      name: "AMD Ryzen 9 7950X",
      totalRamMb: 65536,
      availableRamMb: 16384,
      threadCount: 32,
    });

    assert.equal(cpu.type, "cpu");
    assert.equal(cpu.supportsFlashAttention, false);
    // 16384 available with 2048 OS reserve: can fit 14000 MB, cannot fit 15000 MB
    assert.equal(cpu.canOffloadModel(14000), true);
    assert.equal(cpu.canOffloadModel(15000), false);
    assert.ok(cpu.getThrottleReason()?.includes("CPU execution incurs significant latency penalty"));
  });

  it("should instantiate correct profiles via createHardwareProfile helper", () => {
    const profileGpu = createHardwareProfile("discrete_gpu", {
      name: "RTX 3060",
      totalMemoryMb: 12288,
      availableMemoryMb: 6144,
    });
    assert.equal(profileGpu.type, "discrete_gpu");

    const profileApu = createHardwareProfile("apu", {
      totalMemoryMb: 16384,
      availableMemoryMb: 8192,
    });
    assert.equal(profileApu.type, "apu");

    const profileTpu = createHardwareProfile("tpu", {
      totalMemoryMb: 32768,
      availableMemoryMb: 32768,
    });
    assert.equal(profileTpu.type, "tpu");

    const profileCpu = createHardwareProfile("cpu", {
      totalMemoryMb: 32768,
      availableMemoryMb: 16384,
      units: 16,
    });
    assert.equal(profileCpu.type, "cpu");
  });
});
