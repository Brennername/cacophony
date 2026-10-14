import * as fs from "node:fs";
import * as path from "node:path";
import { GpuDeviceManager, type GpuDeviceDescriptor } from "./GpuDeviceManager.js";

export interface AcceleratorAllocation {
  readonly deviceId: string;
  readonly cardName: string;
  readonly availableVramMb: number;
  readonly totalVramMb: number;
  readonly isApu: boolean;
  readonly environment: Readonly<Record<string, string>>;
}

export interface ModelPlacementPlan {
  readonly modelId: string;
  readonly accelerator: AcceleratorAllocation;
}

/**
 * MultiGpuTaskRouter
 *
 * Discovers GPU accelerators under Linux DRM sysfs and assigns tasks/models
 * to the optimal accelerator based on available VRAM headroom and device affinity.
 */
export class MultiGpuTaskRouter {
  private readonly sysfsDrmPath: string;
  private readonly deviceManager: GpuDeviceManager;

  constructor(
    sysfsDrmPath: string = process.env["SYSFS_DRM_PATH"] || "/sys/class/drm",
    deviceManager?: GpuDeviceManager,
  ) {
    this.sysfsDrmPath = sysfsDrmPath;
    this.deviceManager = deviceManager ?? new GpuDeviceManager();
  }

  public getSysfsDrmPath(): string {
    return this.sysfsDrmPath;
  }

  /**
   * Discovers all physical GPU accelerator devices under /sys/class/drm/card*.
   * Filters out connector subdirectories (such as card0-DP-1 or card0-HDMI-A-1).
   */
  public async discoverAccelerators(): Promise<readonly AcceleratorAllocation[]> {
    const devices = await this.deviceManager.discoverDevices();
    const allocations: AcceleratorAllocation[] = [];

    for (let i = 0; i < devices.length; i++) {
      const dev = devices[i]!;
      const availableBytes = this.queryAvailableVramBytes(dev);
      const totalMb = Math.floor(dev.vramTotalBytes / (1024 * 1024));
      const availableMb = Math.floor(availableBytes / (1024 * 1024));

      allocations.push({
        deviceId: dev.id,
        cardName: dev.cardName,
        availableVramMb: availableMb > 0 ? availableMb : totalMb,
        totalVramMb: totalMb,
        isApu: dev.isPrimaryApu,
        environment: this.getDeviceEnvForModel(dev.id, dev.driver === "nvidia" ? "NVIDIA" : "AMD", i),
      });
    }

    return allocations;
  }

  /**
   * Maps individual model allocations to target accelerator by passing
   * CUDA_VISIBLE_DEVICES or ROCR_VISIBLE_DEVICES / HIP_VISIBLE_DEVICES (T68.5.2).
   *
   * @param deviceId - Physical accelerator identifier (e.g. 'gpu-0').
   * @param vendor - Hardware vendor ('AMD' or 'NVIDIA').
   * @param deviceIndex - Numerical index of accelerator for runtime flags.
   */
  public getDeviceEnvForModel(
    _deviceId: string,
    vendor: "AMD" | "NVIDIA" = "AMD",
    deviceIndex: number = 0,
  ): Record<string, string> {
    const idxStr = deviceIndex.toString();
    if (vendor === "NVIDIA") {
      return {
        CUDA_VISIBLE_DEVICES: idxStr,
      };
    }

    return {
      ROCR_VISIBLE_DEVICES: idxStr,
      HIP_VISIBLE_DEVICES: idxStr,
    };
  }

  /**
   * Assigns a task to the accelerator with the greatest available VRAM headroom (T68.5.4).
   *
   * @param taskId - Unique task identifier.
   * @param requiredVramMb - Estimated memory footprint in megabytes.
   * @param candidateAccelerators - Optional override list of available accelerators.
   */
  public async assignTaskToAccelerator(
    _taskId: string,
    requiredVramMb: number = 0,
    candidateAccelerators?: readonly AcceleratorAllocation[],
  ): Promise<AcceleratorAllocation> {
    const accelerators = candidateAccelerators ?? (await this.discoverAccelerators());

    if (accelerators.length === 0) {
      return {
        deviceId: "gpu-0",
        cardName: "card0",
        availableVramMb: 8192,
        totalVramMb: 16384,
        isApu: true,
        environment: this.getDeviceEnvForModel("gpu-0", "AMD", 0),
      };
    }

    // Filter to accelerators with sufficient headroom if requiredVramMb is specified
    const eligible = requiredVramMb > 0
      ? accelerators.filter((acc) => acc.availableVramMb >= requiredVramMb)
      : accelerators;

    const pool = eligible.length > 0 ? eligible : accelerators;

    // Pick the accelerator with the greatest available VRAM headroom
    let best = pool[0]!;
    for (let i = 1; i < pool.length; i++) {
      const candidate = pool[i]!;
      if (candidate.availableVramMb > best.availableVramMb) {
        best = candidate;
      }
    }

    return best;
  }

  /**
   * Balances concurrent models across discrete GPU and APU when dual-accelerator
   * hardware is detected (T68.5.3).
   * Allocates larger footprint models to discrete GPU with higher VRAM and
   * lighter utility models to APU.
   */
  public async balanceAccelerators(
    models: ReadonlyArray<{ readonly modelId: string; readonly requiredMb: number }>,
    candidateAccelerators?: readonly AcceleratorAllocation[],
  ): Promise<readonly ModelPlacementPlan[]> {
    const accelerators = candidateAccelerators ?? (await this.discoverAccelerators());
    if (accelerators.length === 0 || models.length === 0) {
      return [];
    }

    // Sort models descending by required VRAM footprint
    const sortedModels = [...models].sort((a, b) => b.requiredMb - a.requiredMb);

    // Track dynamic remaining headroom per accelerator
    const dynamicCapacity = new Map<string, { currentFree: number; alloc: AcceleratorAllocation }>();
    for (const acc of accelerators) {
      dynamicCapacity.set(acc.deviceId, { currentFree: acc.availableVramMb, alloc: acc });
    }

    const plans: ModelPlacementPlan[] = [];

    for (const m of sortedModels) {
      // Find candidate with maximum remaining capacity
      let bestDeviceId: string | null = null;
      let maxCap = -1;

      for (const [devId, state] of dynamicCapacity.entries()) {
        if (state.currentFree >= m.requiredMb && state.currentFree > maxCap) {
          maxCap = state.currentFree;
          bestDeviceId = devId;
        }
      }

      // If no accelerator fits cleanly, assign to one with highest raw capacity
      if (!bestDeviceId) {
        let highest = -1;
        for (const [devId, state] of dynamicCapacity.entries()) {
          if (state.currentFree > highest) {
            highest = state.currentFree;
            bestDeviceId = devId;
          }
        }
      }

      if (bestDeviceId) {
        const state = dynamicCapacity.get(bestDeviceId)!;
        state.currentFree -= m.requiredMb;
        plans.push({
          modelId: m.modelId,
          accelerator: state.alloc,
        });
      }
    }

    return plans;
  }

  /**
   * Reads current free VRAM bytes from device sysfs nodes if present.
   */
  private queryAvailableVramBytes(dev: GpuDeviceDescriptor): number {
    try {
      const vramTotalPath = path.join(dev.deviceDir, "mem_info_vram_total");
      const vramUsedPath = path.join(dev.deviceDir, "mem_info_vram_used");
      if (fs.existsSync(vramTotalPath) && fs.existsSync(vramUsedPath)) {
        const total = parseInt(fs.readFileSync(vramTotalPath, "utf-8").trim(), 10);
        const used = parseInt(fs.readFileSync(vramUsedPath, "utf-8").trim(), 10);
        if (!isNaN(total) && !isNaN(used)) {
          return Math.max(0, total - used);
        }
      }
    } catch {
      // Fallback to static capacity
    }
    return dev.vramTotalBytes;
  }
}
