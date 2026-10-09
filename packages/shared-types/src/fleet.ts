import { z } from "zod";

export const FleetNodeStatusSchema = z.enum(["ONLINE", "OFFLINE", "BUSY", "DEGRADED", "DRAINING"]);
export type FleetNodeStatus = z.infer<typeof FleetNodeStatusSchema>;

export const FleetGpuTypeSchema = z.enum(["AMD_VEGA", "AMD_RDNA", "NVIDIA_CUDA", "APPLE_SILICON", "CPU_ONLY"]);
export type FleetGpuType = z.infer<typeof FleetGpuTypeSchema>;

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

export interface HardwareProfileRecord {
  readonly profileId: string;
  readonly gpuType: FleetGpuType;
  readonly optimalBatchSize: number;
  readonly maxContextTokens: number;
  readonly thermalThresholdCelsius: number;
  readonly evalTokensPerSec: number;
}

export interface INodeHealthStatus {
  nodeId: string;
  hostname: string;
  ipAddress: string;
  port: number;
  gpuType: FleetGpuType;
  vramTotalMb: number;
  vramUsedMb: number;
  gpuBusyPercent: number;
  temperatureCelsius: number;
  status: FleetNodeStatus;
  activeTasksCount: number;
  lastHeartbeat: string;
  tokenHash: string;
  activeMemoryUsage: number; // in MB
  apuThermal: number; // in Celsius
  gpuThermal: number; // in Celsius
  currentTaskAssignment?: string | null; // Task ID or null if no task is assigned
}
