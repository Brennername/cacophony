import { execSync } from "node:child_process";
import type { GpuMetrics, HardwareDeviceCategory } from "@cacophony/shared-types";
import type { IHardwareTelemetryProvider } from "./IHardwareTelemetryProvider.js";

export interface NvidiaGpuDevice {
  readonly index: number;
  readonly name: string;
  readonly memoryTotalBytes: number;
  readonly memoryUsedBytes: number;
  readonly memoryFreeBytes: number;
  readonly temperatureCelsius: number;
  readonly powerDrawWatts: number;
  readonly smUtilizationPercent: number;
}

export interface GPUInfo {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  temperature: number;
  powerDrawWatts: number;
  smUtilization: number;
}

export type CommandRunner = (command: string) => string;

/**
 * NvidiaNvmlProvider
 *
 * Harvests real-time GPU telemetry from NVIDIA drivers via the `nvidia-smi` CLI utility.
 * Supports multi-GPU configurations, returning per-device diagnostics and aggregated metrics.
 */
export class NvidiaNvmlProvider implements IHardwareTelemetryProvider {
  public static readonly QUERY_COMMAND =
    "nvidia-smi --query-gpu=index,name,memory.total,memory.used,memory.free,temperature.gpu,power.draw,utilization.gpu --format=csv,noheader,nounits";

  private readonly runCommand: CommandRunner;

  constructor(commandRunner?: CommandRunner) {
    this.runCommand = commandRunner ?? ((cmd: string) => execSync(cmd, { encoding: "utf-8", timeout: 2500 }));
  }

  public getName(): string {
    return "NvidiaNvmlProvider";
  }

  public getCategory(): HardwareDeviceCategory {
    return "NVIDIA_CUDA";
  }

  /**
   * Verifies if nvidia-smi is available and responsive on the system.
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const output = this.runCommand("nvidia-smi -L");
      return output.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Lists all detected NVIDIA GPU accelerators with per-device telemetry.
   */
  public async listDevices(): Promise<NvidiaGpuDevice[]> {
    try {
      const output = this.runCommand(NvidiaNvmlProvider.QUERY_COMMAND);
      const lines = output.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length === 0) {
        throw new Error("No GPU records returned by nvidia-smi");
      }
      return lines.map((line) => this.parseDeviceLine(line));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query NVIDIA GPU devices: ${msg}`);
    }
  }

  /**
   * Legacy method returning per-device GPUInfo objects.
   */
  public async getGPUInfo(): Promise<GPUInfo[]> {
    const devices = await this.listDevices();
    return devices.map((d) => ({
      totalMemory: d.memoryTotalBytes / (1024 * 1024),
      usedMemory: d.memoryUsedBytes / (1024 * 1024),
      freeMemory: d.memoryFreeBytes / (1024 * 1024),
      temperature: d.temperatureCelsius,
      powerDrawWatts: d.powerDrawWatts,
      smUtilization: d.smUtilizationPercent,
    }));
  }

  /**
   * Legacy method returning aggregated GPUInfo across all devices.
   */
  public async getAggregatedGPUInfo(): Promise<GPUInfo> {
    const list = await this.getGPUInfo();
    let totalMemory = 0;
    let usedMemory = 0;
    let freeMemory = 0;
    let totalTemp = 0;
    let totalPower = 0;
    let totalSm = 0;

    for (const info of list) {
      totalMemory += info.totalMemory;
      usedMemory += info.usedMemory;
      freeMemory += info.freeMemory;
      totalTemp += info.temperature;
      totalPower += info.powerDrawWatts;
      totalSm += info.smUtilization;
    }

    const count = list.length || 1;
    return {
      totalMemory,
      usedMemory,
      freeMemory,
      temperature: Math.round(totalTemp / count),
      powerDrawWatts: Math.round(totalPower / count),
      smUtilization: Math.round(totalSm / count),
    };
  }

  /**
   * Samples sensors and computes unified GpuMetrics adhering to IHardwareTelemetryProvider.
   */
  public async sample(): Promise<GpuMetrics> {
    const devices = await this.listDevices();
    let totalVram = 0;
    let usedVram = 0;
    let maxTemp = 0;
    let totalPower = 0;
    let maxSmUtil = 0;

    for (const d of devices) {
      totalVram += d.memoryTotalBytes;
      usedVram += d.memoryUsedBytes;
      if (d.temperatureCelsius > maxTemp) maxTemp = d.temperatureCelsius;
      totalPower += d.powerDrawWatts;
      if (d.smUtilizationPercent > maxSmUtil) maxSmUtil = d.smUtilizationPercent;
    }

    const vramPercent = totalVram > 0 ? Number(((usedVram / totalVram) * 100).toFixed(1)) : 0;

    return {
      gpuBusyPercent: maxSmUtil,
      vramUsedBytes: usedVram,
      vramTotalBytes: totalVram,
      vramPercent,
      gttUsedBytes: 0,
      gttTotalBytes: totalVram,
      edgeTempCelsius: maxTemp,
      vddgfxMilliVolts: 0,
      socMilliVolts: 0,
      pptWatts: totalPower,
      sclkMhz: 0,
    };
  }

  public async getVramMetrics(): Promise<{ totalBytes: number; usedBytes: number; freeBytes: number }> {
    const devices = await this.listDevices();
    let total = 0;
    let used = 0;
    let free = 0;
    for (const d of devices) {
      total += d.memoryTotalBytes;
      used += d.memoryUsedBytes;
      free += d.memoryFreeBytes;
    }
    return { totalBytes: total, usedBytes: used, freeBytes: free };
  }

  public async getThermalMetrics(): Promise<{ temperatureCelsius: number; isThrottled: boolean }> {
    const devices = await this.listDevices();
    let maxTemp = 0;
    for (const d of devices) {
      if (d.temperatureCelsius > maxTemp) maxTemp = d.temperatureCelsius;
    }
    return {
      temperatureCelsius: maxTemp,
      isThrottled: maxTemp >= 83,
    };
  }

  private parseDeviceLine(line: string): NvidiaGpuDevice {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 8) {
      throw new Error(`Invalid CSV format from nvidia-smi: "${line}"`);
    }

    const index = parseInt(parts[0] || "0", 10);
    const name = parts[1] || "NVIDIA GPU";
    const totalMb = parseFloat(parts[2] || "0");
    const usedMb = parseFloat(parts[3] || "0");
    const freeMb = parseFloat(parts[4] || "0");
    const tempC = parseFloat(parts[5] || "0");
    const powerW = parseFloat(parts[6] || "0");
    const utilPercent = parseFloat(parts[7] || "0");

    return {
      index: Number.isNaN(index) ? 0 : index,
      name,
      memoryTotalBytes: Math.round(totalMb * 1024 * 1024),
      memoryUsedBytes: Math.round(usedMb * 1024 * 1024),
      memoryFreeBytes: Math.round(freeMb * 1024 * 1024),
      temperatureCelsius: Number.isNaN(tempC) ? 0 : tempC,
      powerDrawWatts: Number.isNaN(powerW) ? 0 : powerW,
      smUtilizationPercent: Number.isNaN(utilPercent) ? 0 : Math.min(100, Math.max(0, utilPercent)),
    };
  }
}

export default NvidiaNvmlProvider;
