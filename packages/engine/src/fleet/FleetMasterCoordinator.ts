import type {
  FleetNodeRecord,
  FleetNodeRegistration,
  FleetGpuType,
  HardwareProfileRecord
} from "@cacophony/shared-types";

/**
 * FleetMasterCoordinator
 *
 * Central scheduler and telemetry aggregator for multi-node clusters.
 * Dispatches tasks across heterogeneous worker nodes (AMD APU, RDNA, NVIDIA, Apple Silicon)
 * based on VRAM capacity, thermal limits, and hardware benchmarks.
 */
export class FleetMasterCoordinator {
  private readonly nodes = new Map<string, FleetNodeRecord>();
  private readonly hardwareProfiles = new Map<FleetGpuType, HardwareProfileRecord>();

  constructor() {
    this.registerDefaultHardwareProfiles();
  }

  /**
   * Registers or updates a worker node in the cluster.
   */
  public registerNode(registration: FleetNodeRegistration): FleetNodeRecord {
    const node: FleetNodeRecord = {
      nodeId: registration.nodeId,
      hostname: registration.hostname,
      ipAddress: registration.ipAddress,
      port: registration.port,
      gpuType: registration.gpuType,
      vramTotalMb: registration.vramTotalMb,
      vramUsedMb: 0,
      gpuBusyPercent: 0,
      temperatureCelsius: 45,
      status: "ONLINE",
      activeTasksCount: 0,
      lastHeartbeat: new Date().toISOString(),
      tokenHash: Buffer.from(registration.authSecret).toString("base64"),
    };

    this.nodes.set(node.nodeId, node);
    return node;
  }

  /**
   * Updates heartbeat sensor metrics from a worker node.
   */
  public recordHeartbeat(
    nodeId: string,
    telemetry: { vramUsedMb: number; gpuBusyPercent: number; temperatureCelsius: number }
  ): boolean {
    const existing = this.nodes.get(nodeId);
    if (!existing) return false;

    const updated: FleetNodeRecord = {
      ...existing,
      vramUsedMb: telemetry.vramUsedMb,
      gpuBusyPercent: telemetry.gpuBusyPercent,
      temperatureCelsius: telemetry.temperatureCelsius,
      status: telemetry.temperatureCelsius >= 90 ? "DEGRADED" : "ONLINE",
      lastHeartbeat: new Date().toISOString(),
    };

    this.nodes.set(nodeId, updated);
    return true;
  }

  /**
   * Selects the most optimal available node for a given model requirement.
   */
  public selectBestNode(requiredVramMb: number, preferredGpu?: FleetGpuType): FleetNodeRecord | null {
    const candidates = Array.from(this.nodes.values()).filter((n) => {
      const isOnline = n.status === "ONLINE" || n.status === "BUSY";
      const hasVram = n.vramTotalMb - n.vramUsedMb >= requiredVramMb;
      const isCool = n.temperatureCelsius < 85;
      return isOnline && hasVram && isCool;
    });

    if (candidates.length === 0) return null;

    // Filter by preferred GPU if specified
    if (preferredGpu) {
      const matched = candidates.filter((c) => c.gpuType === preferredGpu);
      if (matched.length > 0) {
        return matched.sort((a, b) => a.activeTasksCount - b.activeTasksCount)[0]!;
      }
    }

    // Default to lowest load
    return candidates.sort((a, b) => {
      if (a.activeTasksCount !== b.activeTasksCount) {
        return a.activeTasksCount - b.activeTasksCount;
      }
      return a.gpuBusyPercent - b.gpuBusyPercent;
    })[0]!;
  }

  /**
   * Retrieves all cluster nodes.
   */
  public listNodes(): readonly FleetNodeRecord[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Retrieves benchmark profile for GPU type.
   */
  public getHardwareProfile(gpuType: FleetGpuType): HardwareProfileRecord | undefined {
    return this.hardwareProfiles.get(gpuType);
  }

  private registerDefaultHardwareProfiles(): void {
    this.hardwareProfiles.set("AMD_VEGA", {
      profileId: "profile-amd-vega",
      gpuType: "AMD_VEGA",
      optimalBatchSize: 1,
      maxContextTokens: 8192,
      thermalThresholdCelsius: 80,
      evalTokensPerSec: 32.5,
    });

    this.hardwareProfiles.set("AMD_RDNA", {
      profileId: "profile-amd-rdna",
      gpuType: "AMD_RDNA",
      optimalBatchSize: 2,
      maxContextTokens: 16384,
      thermalThresholdCelsius: 85,
      evalTokensPerSec: 68.0,
    });

    this.hardwareProfiles.set("NVIDIA_CUDA", {
      profileId: "profile-nvidia-cuda",
      gpuType: "NVIDIA_CUDA",
      optimalBatchSize: 4,
      maxContextTokens: 32768,
      thermalThresholdCelsius: 85,
      evalTokensPerSec: 95.0,
    });

    this.hardwareProfiles.set("APPLE_SILICON", {
      profileId: "profile-apple-silicon",
      gpuType: "APPLE_SILICON",
      optimalBatchSize: 2,
      maxContextTokens: 32768,
      thermalThresholdCelsius: 90,
      evalTokensPerSec: 52.0,
    });

    this.hardwareProfiles.set("CPU_ONLY", {
      profileId: "profile-cpu-only",
      gpuType: "CPU_ONLY",
      optimalBatchSize: 1,
      maxContextTokens: 4096,
      thermalThresholdCelsius: 75,
      evalTokensPerSec: 12.0,
    });
  }
}
