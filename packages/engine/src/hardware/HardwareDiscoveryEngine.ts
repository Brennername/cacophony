import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
  HardwareDiscoveryReport,
  DiscoveredDevice,
  HardwareDeviceCategory,
  ComputeBackendType,
} from "@cacophony/shared-types";

const execAsync = promisify(exec);

/**
 * HardwareDiscoveryEngine
 *
 * Probes Linux sysfs (/sys), procfs (/proc), and available device toolchains
 * to identify GPUs, compute topologies, and shared memory apertures without external bloat.
 */
export class HardwareDiscoveryEngine {
  /**
   * Scans host architecture, memory, and devices.
   */
  public async discover(): Promise<HardwareDiscoveryReport> {
    const hostname = os.hostname();
    const hostRamMb = Math.round(os.totalmem() / (1024 * 1024));
    const swapTotalMb = await this.getSwapTotalMb();

    const devices = await this.probeDrmDevices(hostRamMb);
    const detectedTools = await this.detectAvailableTools();

    let primaryCategory: HardwareDeviceCategory = "CPU_FALLBACK";
    let recommendedProfileId = "cpu_default";
    let flashAttentionSupported = false;
    let optimalContextWindow = 4096;
    let maxLoadedModels = 1;
    const warnings: string[] = [];

    if (devices.length > 0) {
      const primary = devices[0]!;
      primaryCategory = primary.category;

      if (primary.category === "AMD_APU_VEGA") {
        recommendedProfileId = "amd_vega_apu_hardened";
        flashAttentionSupported = false;
        optimalContextWindow = 4096;
        maxLoadedModels = 1;
        warnings.push("APU shared memory: Flash Attention is disabled on Vega/Cezanne GFX900 to prevent driver lockups.");
        warnings.push("Recommend setting amdgpu lockup_timeout=120000 in kernel parameters.");
      } else if (primary.category === "AMD_DISCRETE_RDNA") {
        recommendedProfileId = "amd_rdna_rocm";
        flashAttentionSupported = true;
        optimalContextWindow = 16384;
        maxLoadedModels = 2;
      } else if (primary.category === "NVIDIA_CUDA") {
        recommendedProfileId = "nvidia_cuda_accelerated";
        flashAttentionSupported = true;
        optimalContextWindow = 32768;
        maxLoadedModels = 3;
      } else if (primary.category === "APPLE_SILICON") {
        recommendedProfileId = "apple_metal_unified";
        flashAttentionSupported = true;
        optimalContextWindow = 32768;
        maxLoadedModels = 2;
      }
    } else {
      warnings.push("No discrete or integrated GPU detected. Falling back to multi-core CPU inference.");
    }

    return {
      hostname,
      hostRamMb,
      swapTotalMb,
      primaryCategory,
      devices,
      detectedTools,
      recommendedProfileId,
      warnings,
      optimalContextWindow,
      maxLoadedModels,
      flashAttentionSupported,
    };
  }

  private async probeDrmDevices(hostRamMb: number): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    const drmBase = "/sys/class/drm";

    try {
      const entries = await fs.readdir(drmBase);
      const cardEntries = entries.filter((e) => /^card\d+$/.test(e));

      for (const card of cardEntries) {
        try {
          const vendorPath = path.join(drmBase, card, "device/vendor");
          const devicePath = path.join(drmBase, card, "device/device");

          const vendorId = (await fs.readFile(vendorPath, "utf-8")).trim();
          const deviceId = (await fs.readFile(devicePath, "utf-8")).trim();

          const classification = this.classifyPciDevice(vendorId, deviceId, hostRamMb);

          devices.push({
            id: card,
            name: classification.name,
            vendorId,
            deviceId,
            category: classification.category,
            isApu: classification.isApu,
            totalMemoryMb: classification.memoryMb,
            ...(classification.computeUnits ? { computeUnits: classification.computeUnits } : {}),
            recommendedBackend: classification.backend,
          });
        } catch {
          // Skip card if virtual/unreadable
        }
      }
    } catch {
      // In non-Linux or test container environment
    }

    return devices;
  }

  public classifyPciDevice(
    vendorId: string,
    deviceId: string,
    hostRamMb: number
  ): {
    name: string;
    category: HardwareDeviceCategory;
    isApu: boolean;
    memoryMb: number;
    backend: ComputeBackendType;
    computeUnits?: number;
  } {
    const vId = vendorId.toLowerCase();
    const dId = deviceId.toLowerCase();

    // AMD Vendor
    if (vId === "0x1002") {
      // Cezanne / Lucienne / Renoir / Vega integrated APU (e.g. 0x1638, 0x164c, 0x15d8)
      if (["0x1638", "0x164c", "0x15d8", "0x15dd"].includes(dId)) {
        return {
          name: "AMD Cezanne/Vega Integrated Graphics APU",
          category: "AMD_APU_VEGA",
          isApu: true,
          // APU typically shares up to 50% of system host RAM via GTT aperture
          memoryMb: Math.round(hostRamMb * 0.5),
          backend: "Vulkan",
          computeUnits: 8,
        };
      }
      // Modern RDNA2 / RDNA3 discrete
      return {
        name: "AMD Radeon Discrete GPU",
        category: "AMD_DISCRETE_RDNA",
        isApu: false,
        memoryMb: 16384,
        backend: "ROCm",
        computeUnits: 60,
      };
    }

    // NVIDIA Vendor
    if (vId === "0x10de") {
      return {
        name: "NVIDIA CUDA GPU",
        category: "NVIDIA_CUDA",
        isApu: false,
        memoryMb: 24576,
        backend: "CUDA",
        computeUnits: 80,
      };
    }

    // Intel Vendor
    if (vId === "0x8086") {
      return {
        name: "Intel Arc / Iris Xe Graphics",
        category: "INTEL_ARC",
        isApu: true,
        memoryMb: Math.round(hostRamMb * 0.4),
        backend: "Vulkan",
      };
    }

    // Fallback CPU
    return {
      name: "Generic Processor Core",
      category: "CPU_FALLBACK",
      isApu: false,
      memoryMb: hostRamMb,
      backend: "CPU",
    };
  }

  private async getSwapTotalMb(): Promise<number> {
    try {
      const meminfo = await fs.readFile("/proc/meminfo", "utf-8");
      const match = meminfo.match(/SwapTotal:\s+(\d+)\s+kB/);
      if (match && match[1]) {
        return Math.round(parseInt(match[1], 10) / 1024);
      }
    } catch {
      // Non-Linux
    }
    return 0;
  }

  private async detectAvailableTools(): Promise<string[]> {
    const candidates = ["lspci", "rocm-smi", "nvidia-smi", "clinfo", "vulkaninfo", "rocminfo"];
    const detected: string[] = [];

    for (const tool of candidates) {
      try {
        await execAsync(`which ${tool}`);
        detected.push(tool);
      } catch {
        // Not in PATH
      }
    }

    return detected;
  }
}
