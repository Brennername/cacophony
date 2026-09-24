import * as fs from "node:fs";
import * as path from "node:path";
import { AmdVegaTelemetryProvider } from "../telemetry/AmdVegaTelemetryProvider.js";

export interface GpuDeviceDescriptor {
  readonly id: string;
  readonly name: string;
  readonly cardName: string;
  readonly deviceDir: string;
  readonly pciBus: string;
  readonly vramTotalBytes: number;
  readonly isPrimaryApu: boolean;
  readonly driver: string;
}

/**
 * Registry and manager for all discovered GPU/APU accelerators on the host system.
 */
export class GpuDeviceManager {
  private readonly telemetryProvider: AmdVegaTelemetryProvider;

  constructor(telemetryProvider?: AmdVegaTelemetryProvider) {
    this.telemetryProvider = telemetryProvider ?? new AmdVegaTelemetryProvider();
  }

  /**
   * Discovers and enumerates all physical accelerator devices.
   */
  public async discoverDevices(): Promise<readonly GpuDeviceDescriptor[]> {
    const rawDevices = this.telemetryProvider.enumerateAllDevices();
    if (rawDevices.length === 0) {
      // Fallback single device descriptor
      return [
        {
          id: "gpu-0",
          name: "AMD Radeon Vega / Cezanne APU",
          cardName: "card0",
          deviceDir: "/sys/class/drm/card0/device",
          pciBus: "0000:05:00.0",
          vramTotalBytes: 17179869184,
          isPrimaryApu: true,
          driver: "amdgpu"
        }
      ];
    }

    return rawDevices.map((d, index) => {
      let pciBus = "unknown";
      try {
        const ueventPath = path.join(d.deviceDir, "uevent");
        if (fs.existsSync(ueventPath)) {
          const uevent = fs.readFileSync(ueventPath, "utf-8");
          const match = uevent.match(/PCI_SLOT_NAME=([^\s]+)/);
          if (match && match[1]) {
            pciBus = match[1];
          }
        }
      } catch {
        // ignore
      }

      const isPrimary = index === 0;
      return {
        id: `gpu-${index}`,
        name: isPrimary ? "AMD Radeon Vega / Cezanne APU" : `AMD Secondary GPU (${d.cardName})`,
        cardName: d.cardName,
        deviceDir: d.deviceDir,
        pciBus,
        vramTotalBytes: d.vramTotalBytes,
        isPrimaryApu: isPrimary,
        driver: "amdgpu"
      };
    });
  }
}
