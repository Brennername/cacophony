import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HardwareDiscoveryEngine,
  OllamaSystemdGenerator,
  HardwareBenchmarkRunner,
} from "../hardware/index.js";

describe("Phase 27: Autonomous Hardware Feature Discovery & Whitebox Ollama Tuning", () => {
  describe("T27.1: Host Hardware Probing & Multi-Vendor Capability Scanner", () => {
    it("should discover host hardware architecture and classify PCI devices", async () => {
      const engine = new HardwareDiscoveryEngine();
      const report = await engine.discover();

      assert.ok(report.hostname);
      assert.ok(report.hostRamMb > 0);
      assert.ok(report.primaryCategory);
      assert.ok(Array.isArray(report.detectedTools));
    });

    it("should classify AMD Cezanne Vega APU device specifically", () => {
      const engine = new HardwareDiscoveryEngine();
      const classified = engine.classifyPciDevice("0x1002", "0x1638", 16384);

      assert.equal(classified.category, "AMD_APU_VEGA");
      assert.equal(classified.isApu, true);
      assert.equal(classified.backend, "Vulkan");
      assert.equal(classified.computeUnits, 8);
    });

    it("should classify NVIDIA and AMD Discrete devices appropriately", () => {
      const engine = new HardwareDiscoveryEngine();
      const nvidia = engine.classifyPciDevice("0x10de", "0x2204", 32768);
      assert.equal(nvidia.category, "NVIDIA_CUDA");
      assert.equal(nvidia.backend, "CUDA");

      const rdna = engine.classifyPciDevice("0x1002", "0x73ff", 32768);
      assert.equal(rdna.category, "AMD_DISCRETE_RDNA");
      assert.equal(rdna.backend, "ROCm");
    });
  });

  describe("T27.2: Whitebox Ollama Systemd Configuration & Override Generator", () => {
    it("should generate hardened systemd overrides and kernel parameters for AMD Vega APU", () => {
      const generator = new OllamaSystemdGenerator();
      const config = generator.generate({
        hostname: "test-node",
        hostRamMb: 16384,
        swapTotalMb: 8192,
        primaryCategory: "AMD_APU_VEGA",
        devices: [
          {
            id: "card1",
            name: "AMD Cezanne Vega APU",
            vendorId: "0x1002",
            deviceId: "0x1638",
            category: "AMD_APU_VEGA",
            isApu: true,
            totalMemoryMb: 8192,
            recommendedBackend: "Vulkan",
          },
        ],
        detectedTools: ["lspci", "radeontop"],
        recommendedProfileId: "amd_vega_apu_hardened",
        warnings: [],
        optimalContextWindow: 4096,
        maxLoadedModels: 1,
        flashAttentionSupported: false,
      });

      assert.equal(config.profileId, "amd_vega_apu_hardened");
      assert.equal(config.environmentVars["OLLAMA_IGPU_ENABLE"], "1");
      assert.equal(config.environmentVars["OLLAMA_VULKAN"], "1");
      assert.equal(config.environmentVars["OLLAMA_FLASH_ATTENTION"], "0");
      assert.equal(config.environmentVars["OLLAMA_NUM_PARALLEL"], "1");
      assert.ok(config.systemdOverrideContent.includes('Environment="OLLAMA_VULKAN=1"'));
      assert.ok(config.modprobeContent);
      assert.ok(config.modprobeContent.includes("lockup_timeout=120000"));
    });
  });

  describe("T27.3: Hardware Profile Benchmarking & Adaptive Context Tuning", () => {
    it("should run micro-benchmarks across context sizes and determine max stable context", async () => {
      const runner = new HardwareBenchmarkRunner();
      const bench = await runner.benchmark({
        hostname: "vega-host",
        hostRamMb: 16384,
        swapTotalMb: 4096,
        primaryCategory: "AMD_APU_VEGA",
        devices: [],
        detectedTools: [],
        recommendedProfileId: "amd_vega_apu_hardened",
        warnings: [],
        optimalContextWindow: 4096,
        maxLoadedModels: 1,
        flashAttentionSupported: false,
      });

      assert.equal(bench.profileId, "amd_vega_apu_hardened");
      assert.equal(bench.maxStableContext, 4096);
      assert.equal(bench.recommendedConcurrency, 1);
      assert.ok(bench.benchmarks.length >= 4);
      assert.ok(bench.benchmarks[0]!.promptIngestionTokensPerSec > 0);
    });
  });
});
