import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import type {
  HardwareDeviceCategory,
  IHardwareTelemetryProvider,
} from "@cacophony/shared-types";
import { AmdVegaTelemetryProvider } from "../telemetry/AmdVegaTelemetryProvider.js";
import { NvidiaNvmlProvider } from "../telemetry/NvidiaNvmlProvider.js";
import { AppleSiliconProvider } from "../telemetry/AppleSiliconProvider.js";
import { CpuFallbackProvider } from "../telemetry/CpuFallbackProvider.js";

export interface HardwareProviderFactoryOptions {
  readonly commandRunner?: (command: string) => string;
  readonly sysfsDrmPath?: string;
  readonly sysfsHwmonPath?: string;
  readonly kfdPath?: string;
  readonly platform?: string;
  readonly arch?: string;
  readonly forcedCategory?: HardwareDeviceCategory;
}

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

  public async detectCategory(): Promise<HardwareDeviceCategory> {
    // If a forced category is specified, use it immediately.
    if (this.options.forcedCategory) {
      return this.options.forcedCategory;
    }

    // Prioritize Apple Silicon detection based on platform and architecture.
    if (
      this.platform === "darwin" &&
      (this.arch === "arm64" || this.isAppleSiliconSysctl())
    ) {
      return "APPLE_SILICON";
    }

    // Next, check for NVIDIA availability using nvidia-smi.
    if (this.isNvidiaAvailable()) {
      return "NVIDIA_CUDA";
    }

    // Then, check for AMD GPU availability.
    if (this.isAmdAvailable()) {
      return "AMD_APU_VEGA";
    }

    // Check for Intel Arc GPUs
    if (this.isIntelAvailable()) {
        return "INTEL_ARC";
    }

    // If none of the above are detected, fall back to CPU fallback.
    return "CPU_FALLBACK";
  }

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
      if (fs.existsSync(this.drmPath)) {
        const entries = fs.readdirSync(this.drmPath);
        for (const entry of entries) {
          if (entry.startsWith("card") && !entry.includes("-")) {
            const vendorFile = path.join(
              this.drmPath,
              entry,
              "device",
              "vendor",
            );
            if (fs.existsSync(vendorFile)) {
              const vendor = fs
                .readFileSync(vendorFile, "utf-8")
                .trim()
                .toLowerCase();
              if (vendor === "0x1002") return true;
            }
          }
        }
      }

      if (this.options.kfdPath !== undefined) {
        if (fs.existsSync(this.options.kfdPath)) return true;
      } else if (fs.existsSync("/sys/class/kfd") || fs.existsSync("/dev/kfd")) {
        return true;
      }
    } catch {

    }
    return false;
  }

  private isIntelAvailable(): boolean {
    try {
      if (fs.existsSync(this.drmPath)) {
        const entries = fs.readdirSync(this.drmPath);
        for (const entry of entries) {
          if (entry.startsWith("card") && !entry.includes("-")) {
            const vendorFile = path.join(
              this.drmPath,
              entry,
              "device",
              "vendor",
            );
            if (fs.existsSync(vendorFile)) {
              const vendor = fs
                .readFileSync(vendorFile, "utf-8")
                .trim()
                .toLowerCase();
              if (vendor === "0x8086") return true;
            }
          }
        }
      }
    } catch {

    }
    return false;
  }
}
