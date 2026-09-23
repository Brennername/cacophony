import type { GpuMetrics } from "@cacophony/shared-types";

/**
 * Hardware telemetry provider interface for reading GPU and sensor statistics.
 */
export interface IHardwareTelemetryProvider {
  /**
   * Unique name of the telemetry provider strategy.
   */
  getName(): string;

  /**
   * Verifies if this provider can sample the current host system.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Samples current hardware sensors and returns normalized GPU metrics.
   */
  sample(): Promise<GpuMetrics>;
}
