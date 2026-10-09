import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HardwareHyperparameterAutoSizer } from "../scheduler/HardwareHyperparameterAutoSizer.js";

describe("HardwareHyperparameterAutoSizer Suite (T83.4)", () => {
  it("enforces 70% safe allocation limit and 30% OS reservation", () => {
    const bytes16Gb = 16 * 1024 * 1024 * 1024;
    const allocation = HardwareHyperparameterAutoSizer.computeSafeAllocation(bytes16Gb);

    assert.equal(allocation.totalMb, 16384);
    assert.equal(allocation.safeMb, Math.floor(16384 * 0.7)); // 11468
    assert.equal(allocation.reservedMb, 16384 - Math.floor(16384 * 0.7)); // 4916
    assert.equal(allocation.safeMb + allocation.reservedMb, 16384);
  });

  it("sizes 6GB profile correctly", () => {
    const profile = HardwareHyperparameterAutoSizer.computeOptimalProfile({
      totalVramBytes: 6 * 1024 * 1024 * 1024,
      category: "NVIDIA_CUDA",
    });

    assert.equal(profile.contextWindowTokens, 4096);
    assert.equal(profile.maxPredictTokens, 2048);
    assert.equal(profile.numParallel, 1);
    assert.equal(profile.recommendedQuantization, "q4_K_M");
    assert.equal(profile.envVariables["OLLAMA_NUM_PARALLEL"], "1");
    assert.equal(profile.envVariables["OLLAMA_NUM_CTX"], "4096");
  });

  it("sizes 8GB profile correctly", () => {
    const profile = HardwareHyperparameterAutoSizer.computeOptimalProfile({
      totalVramBytes: 8 * 1024 * 1024 * 1024,
      category: "AMD_APU_VEGA",
    });

    assert.equal(profile.contextWindowTokens, 8192);
    assert.equal(profile.maxPredictTokens, 4096);
    assert.equal(profile.numParallel, 1);
    assert.equal(profile.recommendedQuantization, "q4_K_M");
    assert.equal(profile.flashAttention, false); // Vega disables flash attention
  });

  it("sizes 12GB and 16GB configurations", () => {
    const profile12 = HardwareHyperparameterAutoSizer.computeOptimalProfile({
      totalVramBytes: 12 * 1024 * 1024 * 1024,
      category: "NVIDIA_CUDA",
    });
    assert.equal(profile12.contextWindowTokens, 16384);
    assert.equal(profile12.numParallel, 1);

    const profile16 = HardwareHyperparameterAutoSizer.computeOptimalProfile({
      totalVramBytes: 16 * 1024 * 1024 * 1024,
      category: "APPLE_SILICON",
    });
    assert.equal(profile16.contextWindowTokens, 16384);
    assert.equal(profile16.numParallel, 2);
    assert.equal(profile16.flashAttention, true);
  });

  it("sizes 24GB and 64GB configurations", () => {
    const profile24 = HardwareHyperparameterAutoSizer.computeOptimalProfile({
      totalVramBytes: 24 * 1024 * 1024 * 1024,
      category: "NVIDIA_CUDA",
    });
    assert.equal(profile24.contextWindowTokens, 32768);
    assert.equal(profile24.numParallel, 2);
    assert.equal(profile24.recommendedQuantization, "q8_0");

    const profile64 = HardwareHyperparameterAutoSizer.computeOptimalProfile({
      totalVramBytes: 64 * 1024 * 1024 * 1024,
      category: "APPLE_SILICON",
    });
    assert.equal(profile64.contextWindowTokens, 65536);
    assert.equal(profile64.maxPredictTokens, 16384);
    assert.equal(profile64.numParallel, 4);
    assert.equal(profile64.recommendedQuantization, "fp16");
    assert.equal(profile64.envVariables["OLLAMA_NUM_PARALLEL"], "4");
    assert.equal(profile64.envVariables["OLLAMA_NUM_CTX"], "65536");
  });
});
