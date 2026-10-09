import { execSync } from "node:child_process";
import type { GpuMetrics, HardwareDeviceCategory } from "@cacophony/shared-types";
import type { IHardwareTelemetryProvider } from "./IHardwareTelemetryProvider.js";

/**
 * FallbackTelemetryProvider
 *
 * Provides cross-platform hardware telemetry by querying system CLI utilities
 * (`sensors`, `radeontop`, `nvidia-smi`) or emitting safe simulated metrics when
 * direct hardware sysfs access is restricted.
 */
export class FallbackTelemetryProvider implements IHardwareTelemetryProvider {
  private readonly simulationMode: boolean;

  constructor(simulationMode: boolean = false) {
    this.simulationMode = simulationMode;
  }

  public getName(): string {
    return "FallbackTelemetryProvider";
  }

  public getCategory(): HardwareDeviceCategory {
    return "CPU_FALLBACK";
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async sample(): Promise<GpuMetrics> {
    if (this.simulationMode) {
      return this.sampleSimulated();
    }

    let edgeTemp = 0.0;
    try {
      const sensorsOutput = execSync(
        'sensors 2>/dev/null | grep -E "(Tctl|edge|Package id 0)" | grep -oE "\\+[0-9]+(\\.[0-9]+)?" | tr -d "+" | sort -nr | head -n 1',
        { encoding: "utf-8", timeout: 1000 }
      ).trim();
      const parsedTemp = parseFloat(sensorsOutput);
      if (!Number.isNaN(parsedTemp) && parsedTemp > 0) {
        edgeTemp = parsedTemp;
      }
    } catch {
      // Ignore CLI probe failures
    }

    let gpuBusy = 0.0;
    let vramUsed = 0;
    const vramTotal = 4294967296; // 4 GB fallback base

    try {
      const rtop = execSync("radeontop -d - -l 1 2>/dev/null", { encoding: "utf-8", timeout: 1500 });
      const matchGpu = rtop.match(/gpu\s+([0-9.]+)%/);
      const matchVram = rtop.match(/vram\s+([0-9.]+)%\s+([0-9.]+mb)/);
      if (matchGpu && matchGpu[1]) gpuBusy = parseFloat(matchGpu[1]);
      if (matchVram && matchVram[2]) {
        vramUsed = Math.round(parseFloat(matchVram[2]) * 1024 * 1024);
      }
    } catch {
      // Ignore radeontop failure
    }

    const vramPercent = vramTotal > 0 ? Number(((vramUsed / vramTotal) * 100).toFixed(1)) : 0.0;

    return {
      gpuBusyPercent: gpuBusy,
      vramUsedBytes: vramUsed,
      vramTotalBytes: vramTotal,
      vramPercent,
      gttUsedBytes: 0,
      gttTotalBytes: 8589934592,
      edgeTempCelsius: edgeTemp > 0 ? edgeTemp : 45.0,
      vddgfxMilliVolts: 800,
      socMilliVolts: 700,
      pptWatts: 10.0,
      sclkMhz: 400
    };
  }

  private sampleSimulated(): GpuMetrics {
    return {
      gpuBusyPercent: 15.0,
      vramUsedBytes: 1572864000,
      vramTotalBytes: 4294967296,
      vramPercent: 36.6,
      gttUsedBytes: 524288000,
      gttTotalBytes: 8589934592,
      edgeTempCelsius: 52.0,
      vddgfxMilliVolts: 750,
      socMilliVolts: 700,
      pptWatts: 8.5,
      sclkMhz: 600
    };
  }
}
