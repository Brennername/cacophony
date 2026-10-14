/**
 * ComputeHardwareProfile
 *
 * Defines the contract for pluggable compute hardware profiles across
 * discrete GPUs, integrated APUs, cloud/edge TPUs, and pure CPU compute environments.
 * Used by task schedulers and VRAM placement managers to determine workload placement,
 * quantization preferences, and throttling conditions.
 */

export type HardwareProfileType = "discrete_gpu" | "apu" | "tpu" | "cpu";

export interface ComputeHardwareProfile {
  readonly type: HardwareProfileType;
  readonly name: string;
  readonly totalVramMb: number;
  readonly availableVramMb: number;
  readonly computeUnits?: number | undefined;
  readonly supportsFlashAttention: boolean;
  readonly quantizationPreference: "fp16" | "q4_k_m" | "q8_0" | "none";
  canOffloadModel(requiredVramMb: number): boolean;
  getThrottleReason?(): string | null;
}

export interface DiscreteGpuOptions {
  readonly name?: string | undefined;
  readonly totalVramMb: number;
  readonly availableVramMb: number;
  readonly computeUnits?: number | undefined;
  readonly supportsFlashAttention?: boolean | undefined;
}

export interface ApuOptions {
  readonly name?: string | undefined;
  readonly totalVramMb: number;
  readonly availableVramMb: number;
  readonly computeUnits?: number | undefined;
}

export interface TpuOptions {
  readonly name?: string | undefined;
  readonly totalVramMb: number;
  readonly availableVramMb: number;
  readonly computeUnits?: number | undefined;
}

export interface CpuOptions {
  readonly name?: string | undefined;
  readonly totalRamMb: number;
  readonly availableRamMb: number;
  readonly threadCount?: number | undefined;
}

export class DiscreteGpuHardwareProfile implements ComputeHardwareProfile {
  public readonly type = "discrete_gpu" as const;
  public readonly name: string;
  public readonly totalVramMb: number;
  public readonly availableVramMb: number;
  public readonly computeUnits?: number | undefined;
  public readonly supportsFlashAttention: boolean;
  public readonly quantizationPreference = "q4_k_m" as const;

  constructor(options: DiscreteGpuOptions) {
    this.name = options.name ?? "Discrete Dedicated GPU";
    this.totalVramMb = options.totalVramMb;
    this.availableVramMb = options.availableVramMb;
    this.computeUnits = options.computeUnits;
    this.supportsFlashAttention = options.supportsFlashAttention ?? true;
  }

  public canOffloadModel(requiredVramMb: number): boolean {
    // Requires a 512 MB safety reserve buffer
    return this.availableVramMb >= requiredVramMb + 512;
  }

  public getThrottleReason(): string | null {
    if (this.availableVramMb < 1024) {
      return "Critical VRAM exhaustion (< 1024 MB available)";
    }
    return null;
  }
}

export class ApuHardwareProfile implements ComputeHardwareProfile {
  public readonly type = "apu" as const;
  public readonly name: string;
  public readonly totalVramMb: number;
  public readonly availableVramMb: number;
  public readonly computeUnits?: number | undefined;
  public readonly supportsFlashAttention = false;
  public readonly quantizationPreference = "q4_k_m" as const;

  constructor(options: ApuOptions) {
    this.name = options.name ?? "Integrated APU";
    this.totalVramMb = options.totalVramMb;
    this.availableVramMb = options.availableVramMb;
    this.computeUnits = options.computeUnits;
  }

  public canOffloadModel(requiredVramMb: number): boolean {
    // APUs share unified system memory, requiring 1024 MB system headroom
    return this.availableVramMb >= requiredVramMb + 1024;
  }

  public getThrottleReason(): string | null {
    if (this.availableVramMb < 2048) {
      return "Unified system memory constrained for APU execution";
    }
    return null;
  }
}

export class TpuHardwareProfile implements ComputeHardwareProfile {
  public readonly type = "tpu" as const;
  public readonly name: string;
  public readonly totalVramMb: number;
  public readonly availableVramMb: number;
  public readonly computeUnits?: number | undefined;
  public readonly supportsFlashAttention = true;
  public readonly quantizationPreference = "fp16" as const;

  constructor(options: TpuOptions) {
    this.name = options.name ?? "Tensor Processing Unit (TPU)";
    this.totalVramMb = options.totalVramMb;
    this.availableVramMb = options.availableVramMb;
    this.computeUnits = options.computeUnits;
  }

  public canOffloadModel(requiredVramMb: number): boolean {
    return this.availableVramMb >= requiredVramMb;
  }

  public getThrottleReason(): string | null {
    return null;
  }
}

export class CpuHardwareProfile implements ComputeHardwareProfile {
  public readonly type = "cpu" as const;
  public readonly name: string;
  public readonly totalVramMb: number;
  public readonly availableVramMb: number;
  public readonly computeUnits?: number | undefined;
  public readonly supportsFlashAttention = false;
  public readonly quantizationPreference = "q4_k_m" as const;

  constructor(options: CpuOptions) {
    this.name = options.name ?? "Host CPU";
    this.totalVramMb = options.totalRamMb;
    this.availableVramMb = options.availableRamMb;
    this.computeUnits = options.threadCount;
  }

  public canOffloadModel(requiredVramMb: number): boolean {
    // CPU requires at least 2048 MB memory reserve for the operating system
    return this.availableVramMb >= requiredVramMb + 2048;
  }

  public getThrottleReason(): string | null {
    return "CPU execution incurs significant latency penalty compared to accelerator devices";
  }
}

export function createHardwareProfile(
  type: HardwareProfileType,
  options: {
    name?: string | undefined;
    totalMemoryMb: number;
    availableMemoryMb: number;
    units?: number | undefined;
    supportsFlashAttention?: boolean | undefined;
  },
): ComputeHardwareProfile {
  switch (type) {
    case "discrete_gpu":
      return new DiscreteGpuHardwareProfile({
        name: options.name,
        totalVramMb: options.totalMemoryMb,
        availableVramMb: options.availableMemoryMb,
        computeUnits: options.units,
        supportsFlashAttention: options.supportsFlashAttention,
      });
    case "apu":
      return new ApuHardwareProfile({
        name: options.name,
        totalVramMb: options.totalMemoryMb,
        availableVramMb: options.availableMemoryMb,
        computeUnits: options.units,
      });
    case "tpu":
      return new TpuHardwareProfile({
        name: options.name,
        totalVramMb: options.totalMemoryMb,
        availableVramMb: options.availableMemoryMb,
        computeUnits: options.units,
      });
    case "cpu":
      return new CpuHardwareProfile({
        name: options.name,
        totalRamMb: options.totalMemoryMb,
        availableRamMb: options.availableMemoryMb,
        threadCount: options.units,
      });
  }
}
