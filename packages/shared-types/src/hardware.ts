import { z } from "zod";

/**
 * Normalized hardware device categories.
 */
export type HardwareDeviceCategory =
  | "AMD_APU_VEGA"
  | "AMD_DISCRETE_RDNA"
  | "NVIDIA_CUDA"
  | "INTEL_ARC"
  | "APPLE_SILICON"
  | "CPU_FALLBACK";

export const HardwareDeviceCategorySchema = z.enum([
  "AMD_APU_VEGA",
  "AMD_DISCRETE_RDNA",
  "NVIDIA_CUDA",
  "INTEL_ARC",
  "APPLE_SILICON",
  "CPU_FALLBACK",
]);

/**
 * Compute backend runtime type.
 */
export type ComputeBackendType = "Vulkan" | "ROCm" | "CUDA" | "Metal" | "CPU";

export const ComputeBackendTypeSchema = z.enum([
  "Vulkan",
  "ROCm",
  "CUDA",
  "Metal",
  "CPU",
]);

/**
 * Discovered physical or integrated device.
 */
export interface DiscoveredDevice {
  readonly id: string;
  readonly name: string;
  readonly vendorId: string;
  readonly deviceId: string;
  readonly category: HardwareDeviceCategory;
  readonly isApu: boolean;
  readonly totalMemoryMb: number;
  readonly computeUnits?: number;
  readonly recommendedBackend: ComputeBackendType;
}

export const DiscoveredDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  vendorId: z.string(),
  deviceId: z.string(),
  category: HardwareDeviceCategorySchema,
  isApu: z.boolean(),
  totalMemoryMb: z.number(),
  computeUnits: z.number().optional(),
  recommendedBackend: ComputeBackendTypeSchema,
});

/**
 * Full hardware discovery report emitted by HardwareDiscoveryEngine.
 */
export interface HardwareDiscoveryReport {
  readonly hostname: string;
  readonly hostRamMb: number;
  readonly swapTotalMb: number;
  readonly primaryCategory: HardwareDeviceCategory;
  readonly devices: readonly DiscoveredDevice[];
  readonly detectedTools: readonly string[];
  readonly recommendedProfileId: string;
  readonly warnings: readonly string[];
  readonly optimalContextWindow: number;
  readonly maxLoadedModels: number;
  readonly flashAttentionSupported: boolean;
}

export const HardwareDiscoveryReportSchema = z.object({
  hostname: z.string(),
  hostRamMb: z.number(),
  swapTotalMb: z.number(),
  primaryCategory: HardwareDeviceCategorySchema,
  devices: z.array(DiscoveredDeviceSchema),
  detectedTools: z.array(z.string()),
  recommendedProfileId: z.string(),
  warnings: z.array(z.string()),
  optimalContextWindow: z.number(),
  maxLoadedModels: z.number(),
  flashAttentionSupported: z.boolean(),
});

/**
 * Whitebox Ollama systemd override and kernel configuration.
 */
export interface WhiteboxOverrideConfig {
  readonly profileId: string;
  readonly systemdOverridePath: string;
  readonly systemdOverrideContent: string;
  readonly modprobePath?: string;
  readonly modprobeContent?: string;
  readonly environmentVars: Readonly<Record<string, string>>;
}

export const WhiteboxOverrideConfigSchema = z.object({
  profileId: z.string(),
  systemdOverridePath: z.string(),
  systemdOverrideContent: z.string(),
  modprobePath: z.string().optional(),
  modprobeContent: z.string().optional(),
  environmentVars: z.record(z.string()),
});
