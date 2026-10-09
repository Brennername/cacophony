import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import type { HardwareDeviceCategory, IHardwareTelemetryProvider } from "@cacophony/shared-types";
import { AmdVegaTelemetryProvider } from "./AmdVegaTelemetryProvider.js";
import { NvidiaNvmlProvider } from "./NvidiaNvmlProvider.js";
import { AppleSiliconProvider } from "./AppleSiliconProvider.js";
import { CpuFallbackProvider } from "./CpuFallbackProvider.js";

export interface HardwareProviderFactoryOptions {
  readonly commandRunner?: (command: string) => string;
  readonly sysfsDrmPath?: string;
  readonly sysfsHwmonPath?: string;
  readonly kfdPath?: string;
  readonly platform?: string;
  readonly arch?: string;
  readonly forcedCategory?: HardwareDeviceCategory;
}

/**
 * HardwareProviderFactory
 *
 * Dynamically detects host accelerator hardware (NVIDIA CUDA, AMD Vega/RDNA,
 * Apple Silicon Metal, Intel Arc) and instantiates the optimal telemetry provider
 * with zero configuration, gracefully falling back to CPU telemetry.
 */
export class HardwareProviderFactory {
  private readonly options: HardwareProviderFactoryOptions;
  private readonly runCommand: (cmd: string) => string;
  private readonly platform: string;
  private readonly arch: string;
  private readonly drmPath: string;
  private readonly hwmonPath: string;

  constructor(options?: HardwareProviderFactoryOptions) {
    this.options = options ?? {};
    this.runCommand =
      this.options.commandRunner ??
      ((cmd: string) => execSync(cmd, { encoding: "utf-8", timeout: 2000 }));
    this.platform = this.options.platform ?? process.platform;
    this.arch = this.options.arch ?? process.arch;
    this.drmPath =
      this.options.sysfsDrmPath ??
      process.env["SYSFS_DRM_PATH"] ??
      "/sys/class/drm";
    this.hwmonPath =
      this.options.sysfsHwmonPath ??
      process.env["SYSFS_HWMON_PATH"] ??
      "/sys/class/hwmon";
  }

  /**
   * Probes environment and returns the resolved hardware category.
   */
  public async detectCategory(): Promise<HardwareDeviceCategory> {
    if (this.options.forcedCategory) {
      return this.options.forcedCategory;
    }

    // 1. macOS / Apple Silicon detection
    if (this.platform === "darwin" && (this.arch === "arm64" || this.isAppleSiliconSysctl())) {
      return "APPLE_SILICON";
    }

    // 2. NVIDIA CUDA detection via nvidia-smi
    if (this.isNvidiaAvailable()) {
      return "NVIDIA_CUDA";
    }

    // 3. AMD detection via sysfs DRM / HWMON / KFD
    if (this.isAmdAvailable()) {
      return "AMD_APU_VEGA";
    }

    // 4. Intel Arc / Iris Xe detection via DRM vendor
    if (this.isIntelAvailable()) {
      return "INTEL_ARC";
    }

    // 5. Default CPU fallback
    return "CPU_FALLBACK";
  }

  /**
   * Instantiates and returns the optimal IHardwareTelemetryProvider.
   */
  public async createProvider(): Promise<IHardwareTelemetryProvider> {
    const category = await this.detectCategory();

    switch (category) {
      case "APPLE_SILICON":
        return new AppleSiliconProvider({ commandRunner: this.runCommand });
      case "NVIDIA_CUDA":
        return new NvidiaNvmlProvider(this.runCommand);
      case "AMD_APU_VEGA":
      case "AMD_DISCRETE_RDNA":
        return new AmdVegaTelemetryProvider(this.drmPath, this.hwmonPath);
      case "INTEL_ARC":
      case "CPU_FALLBACK":
      default:
        return new CpuFallbackProvider();
    }
  }

  private isAppleSiliconSysctl(): boolean {
    try {
      const output = this.runCommand("sysctl -n machdep.cpu.brand_string");
      return output.toLowerCase().includes("apple");
    } catch {
      return false;
    }
  }

  private isNvidiaAvailable(): boolean {
    try {
      const output = this.runCommand("nvidia-smi -L");
      return output.toLowerCase().includes("gpu");
    } catch {
      return false;
    }
  }

  private isAmdAvailable(): boolean {
    try {
      // Check for AMD PCI vendor ID 0x1002 in sysfs DRM card devices
      if (fs.existsSync(this.drmPath)) {
        const entries = fs.readdirSync(this.drmPath);
        for (const entry of entries) {
          if (entry.startsWith("card") && !entry.includes("-")) {
            const vendorFile = path.join(this.drmPath, entry, "device", "vendor");
            if (fs.existsSync(vendorFile)) {
              const vendor = fs.readFileSync(vendorFile, "utf-8").trim().toLowerCase();
              if (vendor === "0x1002") return true;
            }
          }
        }
      }

      // Check /sys/class/kfd or /dev/kfd
      if (this.options.kfdPath !== undefined) {
        if (fs.existsSync(this.options.kfdPath)) return true;
      } else if (fs.existsSync("/sys/class/kfd") || fs.existsSync("/dev/kfd")) {
        return true;
      }
    } catch {
      // Ignore read errors
    }
    return false;
  }

  private isIntelAvailable(): boolean {
    try {
      if (fs.existsSync(this.drmPath)) {
        const entries = fs.readdirSync(this.drmPath);
        for (const entry of entries) {
          if (entry.startsWith("card") && !entry.includes("-")) {
            const vendorFile = path.join(this.drmPath, entry, "device", "vendor");
            if (fs.existsSync(vendorFile)) {
              const vendor = fs.readFileSync(vendorFile, "utf-8").trim().toLowerCase();
              if (vendor === "0x8086") return true;
            }
          }
        }
      }
    } catch {
      // Ignore read errors
    }
    return false;
  }
}
