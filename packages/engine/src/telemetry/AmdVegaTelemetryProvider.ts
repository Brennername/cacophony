import * as fs from "node:fs";
import * as path from "node:path";
import type { GpuMetrics } from "@cacophony/shared-types";
import type { IHardwareTelemetryProvider } from "./IHardwareTelemetryProvider.js";

/**
 * AmdVegaTelemetryProvider
 *
 * Harvests low-level hardware diagnostics directly from the Linux kernel sysfs
 * interface for AMD GPUs and APUs (Cezanne / Vega architecture).
 *
 * Extracts:
 * - DRM: GPU busy load percentage, VRAM used/total, GTT shared memory used/total
 * - Hwmon: Edge temperature (°C), core voltage vddgfx (mV), package power PPT (W), core clock sclk (MHz)
 */
export class AmdVegaTelemetryProvider implements IHardwareTelemetryProvider {
  private readonly drmPath: string;
  private readonly hwmonBasePath: string;
  private cachedHwmonDir: string | null = null;
  private cachedDrmDeviceDir: string | null = null;

  constructor(
    drmPath: string = process.env["SYSFS_DRM_PATH"] || "/sys/class/drm",
    hwmonBasePath: string = process.env["SYSFS_HWMON_PATH"] || "/sys/class/hwmon"
  ) {
    this.drmPath = drmPath;
    this.hwmonBasePath = hwmonBasePath;
  }

  public getName(): string {
    return "AmdVegaTelemetryProvider";
  }

  /**
   * Discovers whether amdgpu hwmon and drm device nodes exist on the system.
   */
  public async isAvailable(): Promise<boolean> {
    const hwmonDir = this.findAmdgpuHwmonDir();
    const drmDir = this.findAmdgpuDrmDir();
    return Boolean(hwmonDir || drmDir);
  }

  /**
   * Samples physical sensors and computes normalized GpuMetrics.
   */
  public async sample(): Promise<GpuMetrics> {
    const hwmonDir = this.findAmdgpuHwmonDir();
    const drmDir = this.findAmdgpuDrmDir();

    let edgeTemp = 0.0;
    let vddgfx = 0.0;
    let soc = 0.0;
    let pptWatts = 0.0;
    let sclkMhz = 0.0;

    if (hwmonDir) {
      // temp1_input: millidegrees Celsius
      const rawTemp = this.readSysfsInt(path.join(hwmonDir, "temp1_input"));
      if (rawTemp !== null) edgeTemp = Number((rawTemp / 1000).toFixed(1));

      // in0_input: millivolts (vddgfx)
      const rawVddgfx = this.readSysfsInt(path.join(hwmonDir, "in0_input"));
      if (rawVddgfx !== null) vddgfx = rawVddgfx;

      // in1_input: millivolts (vddnb / soc)
      const rawSoc = this.readSysfsInt(path.join(hwmonDir, "in1_input"));
      if (rawSoc !== null) soc = rawSoc;

      // power1_input: microwatts -> Watts
      const rawPower = this.readSysfsInt(path.join(hwmonDir, "power1_input"));
      if (rawPower !== null) pptWatts = Number((rawPower / 1000000).toFixed(2));

      // freq1_input: Hertz -> MHz
      const rawFreq = this.readSysfsInt(path.join(hwmonDir, "freq1_input"));
      if (rawFreq !== null) sclkMhz = Number((rawFreq / 1000000).toFixed(0));
    }

    let gpuBusy = 0.0;
    let vramUsed = 0;
    let vramTotal = 0;
    let gttUsed = 0;
    let gttTotal = 0;

    if (drmDir) {
      const rawBusy = this.readSysfsInt(path.join(drmDir, "gpu_busy_percent"));
      if (rawBusy !== null) gpuBusy = rawBusy;

      const rawVramUsed = this.readSysfsInt(path.join(drmDir, "mem_info_vram_used"));
      if (rawVramUsed !== null) vramUsed = rawVramUsed;

      const rawVramTotal = this.readSysfsInt(path.join(drmDir, "mem_info_vram_total"));
      if (rawVramTotal !== null) vramTotal = rawVramTotal;

      const rawGttUsed = this.readSysfsInt(path.join(drmDir, "mem_info_gtt_used"));
      if (rawGttUsed !== null) gttUsed = rawGttUsed;

      const rawGttTotal = this.readSysfsInt(path.join(drmDir, "mem_info_gtt_total"));
      if (rawGttTotal !== null) gttTotal = rawGttTotal;
    }

    const vramPercent = vramTotal > 0 ? Number(((vramUsed / vramTotal) * 100).toFixed(1)) : 0.0;

    return {
      gpuBusyPercent: gpuBusy,
      vramUsedBytes: vramUsed,
      vramTotalBytes: vramTotal,
      vramPercent,
      gttUsedBytes: gttUsed,
      gttTotalBytes: gttTotal,
      edgeTempCelsius: edgeTemp,
      vddgfxMilliVolts: vddgfx,
      socMilliVolts: soc,
      pptWatts,
      sclkMhz
    };
  }

  /**
   * Scans hwmon directory tree to locate controller with name=amdgpu.
   */
  private findAmdgpuHwmonDir(): string | null {
    if (this.cachedHwmonDir && fs.existsSync(this.cachedHwmonDir)) {
      return this.cachedHwmonDir;
    }

    if (!fs.existsSync(this.hwmonBasePath)) {
      return null;
    }

    try {
      const entries = fs.readdirSync(this.hwmonBasePath);
      for (const entry of entries) {
        const candidate = path.join(this.hwmonBasePath, entry);
        const nameFile = path.join(candidate, "name");
        if (fs.existsSync(nameFile)) {
          const name = fs.readFileSync(nameFile, "utf-8").trim();
          if (name.toLowerCase() === "amdgpu") {
            this.cachedHwmonDir = candidate;
            return candidate;
          }
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Scans DRM directory tree to locate card* device directory containing mem_info nodes.
   */
  private findAmdgpuDrmDir(): string | null {
    if (this.cachedDrmDeviceDir && fs.existsSync(this.cachedDrmDeviceDir)) {
      return this.cachedDrmDeviceDir;
    }

    if (!fs.existsSync(this.drmPath)) {
      return null;
    }

    try {
      const entries = fs.readdirSync(this.drmPath);
      for (const entry of entries) {
        if (/^card[0-9]+$/.test(entry)) {
          const deviceDir = path.join(this.drmPath, entry, "device");
          const vramNode = path.join(deviceDir, "mem_info_vram_total");
          if (fs.existsSync(vramNode)) {
            this.cachedDrmDeviceDir = deviceDir;
            return deviceDir;
          }
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private readSysfsInt(filePath: string): number | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, "utf-8").trim();
      const val = parseInt(raw, 10);
      return Number.isNaN(val) ? null : val;
    } catch {
      return null;
    }
  }
}
