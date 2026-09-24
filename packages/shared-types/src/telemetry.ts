import { z } from "zod";

/**
 * Thermal status zones dictating scheduling pacing delays.
 */
export const ThermalZoneSchema = z.enum(["Nominal", "Warm", "Elevated", "Danger"]);
export type ThermalZone = z.infer<typeof ThermalZoneSchema>;

/**
 * Low-level hardware metrics harvested from host sysfs and sensors.
 */
export interface GpuMetrics {
  readonly gpuBusyPercent: number;
  readonly vramUsedBytes: number;
  readonly vramTotalBytes: number;
  readonly vramPercent: number;
  readonly gttUsedBytes: number;
  readonly gttTotalBytes: number;
  readonly edgeTempCelsius: number;
  readonly vddgfxMilliVolts: number;
  readonly socMilliVolts: number;
  readonly vddnbMilliVolts?: number;
  readonly pptWatts: number;
  readonly sclkMhz: number;
  readonly mclkMhz?: number;
}

/**
 * Active model currently resident in host Ollama VRAM.
 */
export interface OllamaModelInfo {
  readonly name: string;
  readonly model: string;
  readonly sizeBytes: number;
  readonly vramSizeBytes: number;
  readonly details?: {
    readonly format?: string;
    readonly family?: string;
    readonly parameterSize?: string;
    readonly quantizationLevel?: string;
  };
}

/**
 * Point-in-time telemetry snapshot persisted to database and streamed to UI.
 */
export interface HardwareTelemetrySnapshot {
  readonly timestamp: string;
  readonly gpu: GpuMetrics;
  readonly thermalZone: ThermalZone;
  readonly pacingDelaySeconds: number;
  readonly activeModel: OllamaModelInfo | null;
}
