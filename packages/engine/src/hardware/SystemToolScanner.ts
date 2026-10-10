import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import type { ToolRequirement, SystemToolsDiagnosticReport } from "@cacophony/shared-types";

const execFileAsync = promisify(execFile);

export interface ToolDefinition {
  readonly binaryName: string;
  readonly packageName: string;
  readonly category: "gpu_monitor" | "sensors" | "system_inspect" | "driver_diagnostics";
  readonly description: string;
  readonly enabledFeatures: readonly string[];
  readonly disabledFeaturesIfMissing: readonly string[];
  readonly versionArgs?: string;
  readonly parseVersion?: (output: string) => string;
}

export const MONITORED_SYSTEM_TOOLS: readonly ToolDefinition[] = [
  {
    binaryName: "radeontop",
    packageName: "radeontop",
    category: "gpu_monitor",
    description: "Real-time AMD GPU and APU bus utilization, VRAM, and GTT aperture monitor",
    enabledFeatures: [
      "Live VRAM bus percentage tracking",
      "GTT aperture memory readouts",
      "Shader engine activity inspection"
    ],
    disabledFeaturesIfMissing: [
      "Direct VRAM bus telemetry fallback to sysfs estimates",
      "Shader engine activity graph in dashboard"
    ],
    versionArgs: "-v",
    parseVersion: (out) => out.trim().split("\n")[0] ?? "installed"
  },
  {
    binaryName: "sensors",
    packageName: "lm-sensors",
    category: "sensors",
    description: "Linux hardware monitoring sensors for SoC voltages, package temperatures, and fan speeds",
    enabledFeatures: [
      "SoC voltage (vddgfx) extraction",
      "Package thermal monitoring",
      "Power package draw (PPT watts)"
    ],
    disabledFeaturesIfMissing: [
      "ThermalGovernor relies solely on sysfs raw nodes",
      "Voltage level alerts"
    ],
    versionArgs: "-v",
    parseVersion: (out) => out.trim().split("\n")[0] ?? "installed"
  },
  {
    binaryName: "btop",
    packageName: "btop",
    category: "system_inspect",
    description: "Modern high-density terminal resource monitor for CPU, memory, disks, and processes",
    enabledFeatures: [
      "Detailed process thread inspection",
      "Swap memory pressure diagnostics"
    ],
    disabledFeaturesIfMissing: [
      "Terminal visual inspection of host process trees"
    ],
    versionArgs: "--version",
    parseVersion: (out) => out.trim().replace(/^btop version:\s*/i, "")
  },
  {
    binaryName: "vulkaninfo",
    packageName: "vulkan-tools",
    category: "driver_diagnostics",
    description: "Vulkan API device capability, memory heap, and compute queue inspector",
    enabledFeatures: [
      "Vulkan compute queue validation for Ollama",
      "Host visible memory heap verification"
    ],
    disabledFeaturesIfMissing: [
      "Automatic verification of Vulkan acceleration before model launch"
    ],
    versionArgs: "--summary",
    parseVersion: () => "Vulkan API Ready"
  },
  {
    binaryName: "lspci",
    packageName: "pciutils",
    category: "system_inspect",
    description: "PCI bus device identifier and subsystem revision scanner",
    enabledFeatures: [
      "Deterministic PCI device ID extraction",
      "Secondary GPU detection"
    ],
    disabledFeaturesIfMissing: [
      "Discovery limited to /sys/class/drm filesystem entries"
    ],
    versionArgs: "--version",
    parseVersion: (out) => out.trim().split("\n")[0] ?? "installed"
  },
  {
    binaryName: "glxinfo",
    packageName: "mesa-utils",
    category: "driver_diagnostics",
    description: "OpenGL/Mesa driver renderer and direct rendering status checker",
    enabledFeatures: [
      "Mesa driver acceleration confirmation",
      "Direct rendering pipeline check"
    ],
    disabledFeaturesIfMissing: [
      "OpenGL renderer capability detection"
    ],
    versionArgs: "-B",
    parseVersion: (out) => {
      const match = out.match(/OpenGL version string:\s*(.*)/i);
      return match && match[1] ? match[1].trim() : "Mesa GL Ready";
    }
  },
  {
    binaryName: "rocm-smi",
    packageName: "rocm-smi-lib",
    category: "gpu_monitor",
    description: "AMD ROCm System Management Interface for discrete Radeon cards",
    enabledFeatures: [
      "ROCm compute ring telemetry",
      "Discrete AMD GPU power profile switching"
    ],
    disabledFeaturesIfMissing: [
      "ROCm driver status inspection (discrete cards)"
    ],
    versionArgs: "--version",
    parseVersion: (out) => out.trim().split("\n")[0] ?? "installed"
  },
  {
    binaryName: "nvidia-smi",
    packageName: "nvidia-utils",
    category: "gpu_monitor",
    description: "NVIDIA System Management Interface for CUDA compute nodes",
    enabledFeatures: [
      "NVML CUDA device telemetry",
      "Tensor core utilization inspection"
    ],
    disabledFeaturesIfMissing: [
      "NVIDIA GPU monitoring (discrete cards)"
    ],
    versionArgs: "--help",
    parseVersion: () => "NVIDIA Driver Ready"
  }
];

export class SystemToolScanner {
  private readonly toolDefs: readonly ToolDefinition[];
  private readonly execFn: (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

  constructor(
    toolDefs: readonly ToolDefinition[] = MONITORED_SYSTEM_TOOLS,
    customExec?: ((cmd: string) => Promise<{ stdout: string; stderr: string }>) | ((file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>)
  ) {
    this.toolDefs = toolDefs;
    if (customExec) {
      this.execFn = async (file: string, args: string[]) => {
        if (customExec.length === 1) {
          const fullCmd = args.length > 0 ? `${file} ${args.join(" ")}` : file;
          return (customExec as (cmd: string) => Promise<{ stdout: string; stderr: string }>)(fullCmd);
        }
        return (customExec as (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>)(file, args);
      };
    } else {
      this.execFn = (file: string, args: string[]) => execFileAsync(file, args);
    }
  }

  public async scan(): Promise<SystemToolsDiagnosticReport> {
    const results: ToolRequirement[] = [];

    for (const def of this.toolDefs) {
      const status = await this.checkTool(def);
      results.push(status);
    }

    const missing = results.filter((t) => !t.installed);
    const allRequiredInstalled = missing.length === 0;

    const missingPackages = Array.from(new Set(missing.map((m) => m.packageName)));
    const unifiedInstallCommand =
      missingPackages.length > 0
        ? `sudo apt update && sudo apt install -y ${missingPackages.join(" ")}`
        : "";

    const missingCapabilities = missing.flatMap((m) => m.disabledFeaturesIfMissing);

    return {
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      allRequiredInstalled,
      tools: results,
      missingTools: missing,
      unifiedInstallCommand,
      missingCapabilities
    };
  }

  public async checkTool(def: ToolDefinition): Promise<ToolRequirement> {
    const binaryName = def.binaryName;
    if (!/^[a-zA-Z0-9_-]+$/.test(binaryName)) {
      throw new Error(`Invalid binary name: ${binaryName}`);
    }
    const versionArgs = def.versionArgs ? def.versionArgs.trim().split(/\s+/).filter(Boolean) : [];
    for (const arg of versionArgs) {
      if (!/^--?[a-zA-Z0-9_-]+$/.test(arg)) {
        throw new Error(`Invalid version argument: ${arg}`);
      }
    }

    try {
      await this.execFn("which", [binaryName]);
      let version: string | undefined;

      if (versionArgs.length > 0) {
        try {
          const { stdout } = await this.execFn(binaryName, versionArgs);
          version = def.parseVersion ? def.parseVersion(stdout) : stdout.trim().split("\n")[0];
        } catch {
          version = "installed";
        }
      }

      return {
        binaryName: def.binaryName,
        packageName: def.packageName,
        category: def.category,
        installed: true,
        version: version ?? "installed",
        description: def.description,
        enabledFeatures: def.enabledFeatures,
        disabledFeaturesIfMissing: def.disabledFeaturesIfMissing,
        installCommand: `sudo apt install -y ${def.packageName}`
      };
    } catch {
      return {
        binaryName: def.binaryName,
        packageName: def.packageName,
        category: def.category,
        installed: false,
        description: def.description,
        enabledFeatures: def.enabledFeatures,
        disabledFeaturesIfMissing: def.disabledFeaturesIfMissing,
        installCommand: `sudo apt install -y ${def.packageName}`
      };
    }
  }
}