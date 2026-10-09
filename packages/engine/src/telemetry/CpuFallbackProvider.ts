import * as os from "node:os";
import * as fs from "node:fs";
import type { GpuMetrics, HardwareDeviceCategory } from "@cacophony/shared-types";
import type { IHardwareTelemetryProvider } from "./IHardwareTelemetryProvider.js";

/**
 * CpuFallbackProvider
 *
 * Provides CPU and system RAM telemetry when dedicated GPU accelerators
 * are not present or accessible. GpuMetrics are mapped to CPU core load,
 * system memory utilization, and Linux kernel thermal zone sensors.
 */
export class CpuFallbackProvider implements IHardwareTelemetryProvider {
  public getName(): string {
    return "CpuFallbackProvider";
  }

  public getCategory(): HardwareDeviceCategory {
    return "CPU_FALLBACK";
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Retrieves the total system physical memory in bytes.
   */
  public getTotalMemory(): number {
    return os.totalmem();
  }

  /**
   * Retrieves the available free physical memory in bytes.
   */
  public getFreeMemory(): number {
    return os.freemem();
  }

  /**
   * Retrieves total logical CPU execution cores.
   */
  public getTotalCpuCores(): number {
    return os.cpus().length;
  }

  /**
   * Samples system memory and CPU load, returning normalized GpuMetrics.
   */
  public async sample(): Promise<GpuMetrics> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(0, totalMem - freeMem);
    const memPercent = totalMem > 0 ? Number(((usedMem / totalMem) * 100).toFixed(1)) : 0;

    const cores = os.cpus().length || 1;
    const load1Min = os.loadavg()[0] ?? 0;
    const cpuUtilization = Math.min(100, Math.max(0, Number(((load1Min / cores) * 100).toFixed(1))));

    const edgeTemp = this.sampleHostCpuTemp();

    return {
      gpuBusyPercent: cpuUtilization,
      vramUsedBytes: usedMem,
      vramTotalBytes: totalMem,
      vramPercent: memPercent,
      gttUsedBytes: 0,
      gttTotalBytes: 0,
      edgeTempCelsius: edgeTemp,
      vddgfxMilliVolts: 0,
      socMilliVolts: 0,
      pptWatts: 0,
      sclkMhz: 0,
    };
  }

  public async getVramMetrics(): Promise<{ totalBytes: number; usedBytes: number; freeBytes: number }> {
    const total = os.totalmem();
    const free = os.freemem();
    return {
      totalBytes: total,
      usedBytes: Math.max(0, total - free),
      freeBytes: free,
    };
  }

  public async getThermalMetrics(): Promise<{ temperatureCelsius: number; isThrottled: boolean }> {
    const temp = this.sampleHostCpuTemp();
    return {
      temperatureCelsius: temp,
      isThrottled: temp >= 85,
    };
  }

  /**
   * Probes Linux sysfs thermal zones or returns 45.0 default if unavailable.
   */
  private sampleHostCpuTemp(): number {
    try {
      const thermalZonePath = "/sys/class/thermal/thermal_zone0/temp";
      if (fs.existsSync(thermalZonePath)) {
        const raw = fs.readFileSync(thermalZonePath, "utf-8").trim();
        const milliC = parseInt(raw, 10);
        if (!Number.isNaN(milliC) && milliC > 0) {
          return Number((milliC / 1000).toFixed(1));
        }
      }
    } catch {
      // Non-Linux or inaccessible sysfs
    }
    return 45.0;
  }
}
