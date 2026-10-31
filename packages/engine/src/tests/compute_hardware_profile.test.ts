import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DiscreteGpuHardwareProfile,
  ApuHardwareProfile,
  TpuHardwareProfile,
  CpuHardwareProfile,
  createHardwareProfile,
} from "../hardware/ComputeHardwareProfile.js";

describe("ComputeHardwareProfile Test Suite", () => {
  describe("DiscreteGpuHardwareProfile", () => {
    it("should initialize with default name and flash attention enabled", () => {
      const gpu = new DiscreteGpuHardwareProfile({
        totalVramMb: 16384,
        availableVramMb: 8192,
        computeUnits: 60,
      });

      assert.strictEqual(gpu.type, "discrete_gpu");
      assert.strictEqual(gpu.name, "Discrete Dedicated GPU");
      assert.strictEqual(gpu.totalVramMb, 16384);
      assert.strictEqual(gpu.availableVramMb, 8192);
      assert.strictEqual(gpu.computeUnits, 60);
      assert.strictEqual(gpu.supportsFlashAttention, true);
      assert.strictEqual(gpu.quantizationPreference, "q4_k_m");
      assert.strictEqual(gpu.getThrottleReason(), null);
    });

    it("should validate offload feasibility requiring 512MB headroom", () => {
      const gpu = new DiscreteGpuHardwareProfile({
        totalVramMb: 8192,
        availableVramMb: 4096,
      });

      // Exactly 3584 + 512 = 4096: fits
      assert.strictEqual(gpu.canOffloadModel(3584), true);
      // 3585 + 512 = 4097 > 4096: does not fit
      assert.strictEqual(gpu.canOffloadModel(3585), false);
    });

    it("should report throttle reason when available VRAM drops below 1024MB", () => {
      const gpu = new DiscreteGpuHardwareProfile({
        totalVramMb: 8192,
        availableVramMb: 1023,
      });

      assert.match(
        gpu.getThrottleReason() ?? "",
        /Critical VRAM exhaustion/,
      );
    });
  });

  describe("ApuHardwareProfile", () => {
    it("should initialize integrated APU profile without flash attention", () => {
      const apu = new ApuHardwareProfile({
        name: "AMD Radeon 780M",
        totalVramMb: 16384,
        availableVramMb: 6144,
        computeUnits: 12,
      });

      assert.strictEqual(apu.type, "apu");
      assert.strictEqual(apu.name, "AMD Radeon 780M");
      assert.strictEqual(apu.supportsFlashAttention, false);
      assert.strictEqual(apu.quantizationPreference, "q4_k_m");
    });

    it("should require 1024MB system headroom for unified memory offload", () => {
      const apu = new ApuHardwareProfile({
        totalVramMb: 8192,
        availableVramMb: 4096,
      });

      // 3072 + 1024 = 4096: fits
      assert.strictEqual(apu.canOffloadModel(3072), true);
      // 3073 + 1024 = 4097 > 4096: does not fit
      assert.strictEqual(apu.canOffloadModel(3073), false);
    });

    it("should report memory constraint throttle when available VRAM drops below 2048MB", () => {
      const apuWarm = new ApuHardwareProfile({
        totalVramMb: 8192,
        availableVramMb: 2047,
      });

      assert.match(
        apuWarm.getThrottleReason() ?? "",
        /Unified system memory constrained for APU execution/,
      );

      const apuHealthy = new ApuHardwareProfile({
        totalVramMb: 8192,
        availableVramMb: 2048,
      });
      assert.strictEqual(apuHealthy.getThrottleReason(), null);
    });
  });

  describe("TpuHardwareProfile", () => {
    it("should initialize TPU with fp16 quantization preference and zero headroom requirement", () => {
      const tpu = new TpuHardwareProfile({
        name: "Google Coral Edge TPU",
        totalVramMb: 4096,
        availableVramMb: 2048,
        computeUnits: 8,
      });

      assert.strictEqual(tpu.type, "tpu");
      assert.strictEqual(tpu.supportsFlashAttention, true);
      assert.strictEqual(tpu.quantizationPreference, "fp16");
      assert.strictEqual(tpu.canOffloadModel(2048), true);
      assert.strictEqual(tpu.canOffloadModel(2049), false);
      assert.strictEqual(tpu.getThrottleReason(), null);
    });
  });

  describe("CpuHardwareProfile", () => {
    it("should map system RAM and require 2048MB OS reserve", () => {
      const cpu = new CpuHardwareProfile({
        name: "AMD Ryzen 9 7940HS",
        totalRamMb: 32768,
        availableRamMb: 8192,
        threadCount: 16,
      });

      assert.strictEqual(cpu.type, "cpu");
      assert.strictEqual(cpu.name, "AMD Ryzen 9 7940HS");
      assert.strictEqual(cpu.totalVramMb, 32768);
      assert.strictEqual(cpu.availableVramMb, 8192);
      assert.strictEqual(cpu.computeUnits, 16);
      assert.strictEqual(cpu.supportsFlashAttention, false);

      // 6144 + 2048 = 8192: fits
      assert.strictEqual(cpu.canOffloadModel(6144), true);
      // 6145 + 2048 = 8193 > 8192: does not fit
      assert.strictEqual(cpu.canOffloadModel(6145), false);
      assert.match(cpu.getThrottleReason() ?? "", /latency penalty/);
    });
  });

  describe("createHardwareProfile Factory", () => {
    it("should create profile instances matching the specified profile type", () => {
      const discrete = createHardwareProfile("discrete_gpu", {
        totalMemoryMb: 12288,
        availableMemoryMb: 6144,
      });
      assert.ok(discrete instanceof DiscreteGpuHardwareProfile);

      const apu = createHardwareProfile("apu", {
        totalMemoryMb: 16384,
        availableMemoryMb: 8192,
      });
      assert.ok(apu instanceof ApuHardwareProfile);

      const tpu = createHardwareProfile("tpu", {
        totalMemoryMb: 8192,
        availableMemoryMb: 4096,
      });
      assert.ok(tpu instanceof TpuHardwareProfile);

      const cpu = createHardwareProfile("cpu", {
        totalMemoryMb: 32768,
        availableMemoryMb: 16384,
      });
      assert.ok(cpu instanceof CpuHardwareProfile);
    });
  });
});
