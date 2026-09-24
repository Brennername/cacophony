import { z } from "zod";

/**
 * Fleet node status.
 */
export const FleetNodeStatusSchema = z.enum(["ONLINE", "OFFLINE", "BUSY", "DEGRADED", "DRAINING"]);
export type FleetNodeStatus = z.infer<typeof FleetNodeStatusSchema>;

/**
 * Supported GPU architecture types in fleet.
 */
export const FleetGpuTypeSchema = z.enum(["AMD_VEGA", "AMD_RDNA", "NVIDIA_CUDA", "APPLE_SILICON", "CPU_ONLY"]);
export type FleetGpuType = z.infer<typeof FleetGpuTypeSchema>;

/**
 * Fleet node entity.
 */
export interface FleetNodeRecord {
  readonly nodeId: string;
  readonly hostname: string;
  readonly ipAddress: string;
  readonly port: number;
  readonly gpuType: FleetGpuType;
  readonly vramTotalMb: number;
  readonly vramUsedMb: number;
  readonly gpuBusyPercent: number;
  readonly temperatureCelsius: number;
  readonly status: FleetNodeStatus;
  readonly activeTasksCount: number;
  readonly lastHeartbeat: string;
  readonly tokenHash: string;
}

/**
 * Node registration request schema.
 */
export const FleetNodeRegistrationSchema = z.object({
  nodeId: z.string(),
  hostname: z.string(),
  ipAddress: z.string(),
  port: z.number().default(24074),
  gpuType: FleetGpuTypeSchema,
  vramTotalMb: z.number(),
  authSecret: z.string(),
});
export type FleetNodeRegistration = z.infer<typeof FleetNodeRegistrationSchema>;

/**
 * Hardware benchmark profile record.
 */
export interface HardwareProfileRecord {
  readonly profileId: string;
  readonly gpuType: FleetGpuType;
  readonly optimalBatchSize: number;
  readonly maxContextTokens: number;
  readonly thermalThresholdCelsius: number;
  readonly evalTokensPerSec: number;
}
