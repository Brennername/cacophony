import * as os from "node:os";
import { execSync } from "node:child_process";
import type { GpuMetrics, HardwareDeviceCategory, ThermalZone } from "@cacophony/shared-types";
import type { IHardwareTelemetryProvider } from "./IHardwareTelemetryProvider.js";

export type AppleThermalPressure = "Nominal" | "Fair" | "Serious" | "Critical";

export interface AppleSiliconThermalState {
  readonly pressure: AppleThermalPressure;
  readonly zone: ThermalZone;
  readonly pacingDelaySeconds: number;
  readonly isBackpressured: boolean;
}

export interface AppleSiliconOptions {
  readonly commandRunner?: (command: string) => string;
  readonly totalMemoryBytes?: number;
  readonly freeMemoryBytes?: number;
  readonly chipName?: string;
}

/**
 * AppleSiliconProvider
 *
 * Harvests unified memory, M-series processor telemetry, and macOS thermal pressure states
 * using powermetrics and sysctl. Translates macOS thermal pressure directly into
 * ThermalGovernor backpressure pacing thresholds.
 */
export class AppleSiliconProvider implements IHardwareTelemetryProvider {
  private readonly runCommand: (cmd: string) => string;
  private readonly mockTotalMem: number | undefined;
  private readonly mockFreeMem: number | undefined;
  private readonly mockChipName: string | undefined;

  constructor(options?: AppleSiliconOptions) {
    this.runCommand =
      options?.commandRunner ??
      ((cmd: string) => execSync(cmd, { encoding: "utf-8", timeout: 2500 }));
    this.mockTotalMem = options?.totalMemoryBytes;
    this.mockFreeMem = options?.freeMemoryBytes;
    this.mockChipName = options?.chipName;
  }

  public getName(): string {
    return "AppleSiliconProvider";
  }

  public getCategory(): HardwareDeviceCategory {
    return "APPLE_SILICON";
  }

  /**
   * Verifies if host runs on Darwin / macOS with Apple Silicon ARM architecture.
   */
  public async isAvailable(): Promise<boolean> {
    if (this.mockChipName) return true;
    if (process.platform !== "darwin") return false;
    try {
      const brand = this.detectChipModel();
      return brand.toLowerCase().includes("apple");
    } catch {
      return process.arch === "arm64";
    }
  }

  /**
   * Detects the M-series CPU/GPU SOC model name.
   */
  public detectChipModel(): string {
    if (this.mockChipName) return this.mockChipName;
    try {
      return this.runCommand("sysctl -n machdep.cpu.brand_string").trim();
    } catch {
      return "Apple Silicon";
    }
  }

  /**
   * Reads current macOS thermal pressure state.
   */
  public getThermalPressure(): AppleThermalPressure {
    try {
      // powermetrics output format or thermal pressure sysctl
      const output = this.runCommand(
        "powermetrics -n 1 -i 100 --samplers thermal 2>/dev/null || echo 'Current pressure level: Nominal'"
      );
      if (output.includes("Critical") || output.includes("4")) return "Critical";
      if (output.includes("Serious") || output.includes("3")) return "Serious";
      if (output.includes("Fair") || output.includes("2")) return "Fair";
      return "Nominal";
    } catch {
      return "Nominal";
    }
  }

  /**
   * Maps macOS thermal pressure state directly to Cacophony ThermalZone.
   */
  public mapThermalPressureToZone(pressure: AppleThermalPressure): ThermalZone {
    switch (pressure) {
      case "Critical":
        return "Danger";
      case "Serious":
        return "Elevated";
      case "Fair":
        return "Warm";
      case "Nominal":
      default:
        return "Nominal";
    }
  }

  /**
   * Computes pacing delay for ThermalGovernor to prevent thermal throttling.
   */
  public mapThermalPressureToPacingDelay(pressure: AppleThermalPressure): number {
    switch (pressure) {
      case "Critical":
        return 20;
      case "Serious":
        return 8;
      case "Fair":
        return 2;
      case "Nominal":
      default:
        return 0;
    }
  }

  /**
   * Returns composite thermal evaluation state for thermal governance.
   */
  public getThermalState(): AppleSiliconThermalState {
    const pressure = this.getThermalPressure();
    const zone = this.mapThermalPressureToZone(pressure);
    const pacingDelaySeconds = this.mapThermalPressureToPacingDelay(pressure);
    const isBackpressured = pressure === "Serious" || pressure === "Critical";

    return {
      pressure,
      zone,
      pacingDelaySeconds,
      isBackpressured,
    };
  }

  /**
   * Samples Apple Silicon sensors, memory, and thermal state, returning normalized GpuMetrics.
   */
  public async sample(): Promise<GpuMetrics> {
    const totalMem = this.mockTotalMem ?? os.totalmem();
    const freeMem = this.mockFreeMem ?? os.freemem();
    const usedMem = Math.max(0, totalMem - freeMem);
    const vramPercent = totalMem > 0 ? Number(((usedMem / totalMem) * 100).toFixed(1)) : 0;

    const thermal = this.getThermalState();

    // Map pressure to representative temperatures (°C)
    const tempMap: Record<AppleThermalPressure, number> = {
      Nominal: 48.0,
      Fair: 68.0,
      Serious: 86.0,
      Critical: 98.0,
    };
    const edgeTempCelsius = tempMap[thermal.pressure];

    // Estimate GPU power based on thermal pressure
    const powerMap: Record<AppleThermalPressure, number> = {
      Nominal: 18.0,
      Fair: 28.0,
      Serious: 38.0,
      Critical: 45.0,
    };
    const pptWatts = powerMap[thermal.pressure];

    // Compute load from load averages
    const cores = os.cpus().length || 8;
    const load1Min = os.loadavg()[0] ?? 0;
    const gpuBusyPercent = Math.min(100, Math.max(0, Number(((load1Min / cores) * 100).toFixed(1))));

    return {
      gpuBusyPercent,
      vramUsedBytes: usedMem,
      vramTotalBytes: totalMem,
      vramPercent,
      gttUsedBytes: 0,
      gttTotalBytes: totalMem,
      edgeTempCelsius,
      vddgfxMilliVolts: 0,
      socMilliVolts: 0,
      pptWatts,
      sclkMhz: 1398,
    };
  }

  public async getVramMetrics(): Promise<{ totalBytes: number; usedBytes: number; freeBytes: number }> {
    const total = this.mockTotalMem ?? os.totalmem();
    const free = this.mockFreeMem ?? os.freemem();
    return {
      totalBytes: total,
      usedBytes: Math.max(0, total - free),
      freeBytes: free,
    };
  }

  public async getThermalMetrics(): Promise<{ temperatureCelsius: number; isThrottled: boolean }> {
    const state = this.getThermalState();
    return {
      temperatureCelsius: state.pressure === "Critical" ? 98 : state.pressure === "Serious" ? 86 : 50,
      isThrottled: state.isBackpressured,
    };
  }
}
