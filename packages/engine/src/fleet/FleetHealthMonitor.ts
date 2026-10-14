import type {
  INodeHealthStatus,
  FleetNodeStatus,
} from "@cacophony/shared-types";

/**
 * FleetHealthMonitorOptions
 */
export interface FleetHealthMonitorOptions {
  /**
   * Heartbeat timeout in milliseconds before a node is marked OFFLINE.
   * Default: 30,000ms (30 seconds).
   */
  readonly heartbeatTimeoutMs?: number;

  /**
   * Temperature in Celsius at which a node enters thermal throttling.
   * Default: 80 degrees Celsius.
   */
  readonly thermalThresholdCelsius?: number;
}

/**
 * FleetHealthMonitor
 *
 * Implements real-time node health monitoring and heartbeat tracking (T86.1):
 * - Ingests periodic UDP/HTTP heartbeats from peer worker nodes.
 * - Tracks VRAM usage, APU/GPU thermals, and active task assignments.
 * - Transitions stale nodes (>30s silence) to OFFLINE state.
 * - Flags nodes with elevated thermals as DEGRADED or throttling.
 */
export class FleetHealthMonitor {
  private readonly nodes = new Map<string, INodeHealthStatus>();
  private readonly heartbeatTimeoutMs: number;
  private readonly thermalThresholdCelsius: number;
  private livenessTimer: NodeJS.Timeout | null = null;

  constructor(options: FleetHealthMonitorOptions = {}) {
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 30000;
    this.thermalThresholdCelsius = options.thermalThresholdCelsius ?? 80;
  }

  /**
   * Records or updates a node heartbeat.
   * Automatically adjusts status to DEGRADED if thermals exceed safe operational threshold.
   */
  public recordHeartbeat(status: INodeHealthStatus): void {
    const isThermalThrottling =
      status.temperatureCelsius >= this.thermalThresholdCelsius ||
      status.gpuThermal >= this.thermalThresholdCelsius ||
      status.apuThermal >= this.thermalThresholdCelsius;

    let computedStatus: FleetNodeStatus = status.status;
    if (
      isThermalThrottling &&
      computedStatus !== "OFFLINE" &&
      computedStatus !== "DRAINING"
    ) {
      computedStatus = "DEGRADED";
    }

    const updatedNode: INodeHealthStatus = {
      ...status,
      status: computedStatus,
      lastHeartbeat: new Date().toISOString(),
    };

    this.nodes.set(status.nodeId, updatedNode);
  }

  /**
   * Retrieves a specific node status by ID.
   */
  public getNode(nodeId: string): INodeHealthStatus | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Lists all tracked nodes.
   */
  public listNodes(): INodeHealthStatus[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Lists active, operational nodes capable of accepting workloads.
   */
  public getAvailableNodes(): INodeHealthStatus[] {
    this.checkNodeLiveness();
    return Array.from(this.nodes.values()).filter(
      (node) =>
        node.status === "ONLINE" ||
        (node.status === "BUSY" && node.activeTasksCount < 3),
    );
  }

  /**
   * Scans tracked nodes and transitions stale nodes to OFFLINE if the heartbeat has expired.
   */
  public checkNodeLiveness(): void {
    const now = Date.now();
    for (const [nodeId, node] of this.nodes.entries()) {
      const lastHeartbeatTime = new Date(node.lastHeartbeat).getTime();
      const elapsedMs = now - lastHeartbeatTime;

      if (elapsedMs > this.heartbeatTimeoutMs && node.status !== "OFFLINE") {
        this.nodes.set(nodeId, {
          ...node,
          status: "OFFLINE",
          activeTasksCount: 0,
          currentTaskAssignment: null,
        });
      }
    }
  }

  /**
   * Starts periodic liveness checking timer.
   */
  public startLivenessCheck(intervalMs = 10000): void {
    if (this.livenessTimer) {
      clearInterval(this.livenessTimer);
    }
    this.livenessTimer = setInterval(() => {
      this.checkNodeLiveness();
    }, intervalMs);
    this.livenessTimer.unref?.();
  }

  /**
   * Stops periodic liveness checking timer.
   */
  public stopLivenessCheck(): void {
    if (this.livenessTimer) {
      clearInterval(this.livenessTimer);
      this.livenessTimer = null;
    }
  }

  /**
   * Deregisters a node from the monitor.
   */
  public removeNode(nodeId: string): boolean {
    return this.nodes.delete(nodeId);
  }

  /**
   * Clears all tracked nodes.
   */
  public clear(): void {
    this.nodes.clear();
  }
}
