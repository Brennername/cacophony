import type { FleetHealthMonitor } from "../fleet/FleetHealthMonitor.js";

/**
 * TaskPlacementDecision
 */
export interface TaskPlacementDecision {
  readonly nodeId: string;
  readonly isLocal: boolean;
  readonly reason: string;
  readonly targetHost?: string;
  readonly targetPort?: number;
}

/**
 * TaskDispatchRequirements
 */
export interface TaskDispatchRequirements {
  readonly taskId: string;
  readonly model: string;
  readonly estimatedVramMb?: number;
  readonly priority?: string;
}

/**
 * DistributedTaskDispatcher
 *
 * Implements multi-node task routing and load balancing (T86.2):
 * - Evaluates node VRAM headroom and thermal metrics from FleetHealthMonitor.
 * - Routes compute-heavy tasks to nodes with appropriate GPU capacity.
 * - Migrates tasks from thermal-throttling nodes to cooler nodes.
 * - Falls back to local node when no suitable peer worker is available.
 */
export class DistributedTaskDispatcher {
  private readonly localNodeId: string;
  private readonly healthMonitor: FleetHealthMonitor;

  constructor(healthMonitor: FleetHealthMonitor, localNodeId = "orchestrator-local") {
    this.healthMonitor = healthMonitor;
    this.localNodeId = localNodeId;
  }

  /**
   * Determines optimal placement for a task based on model requirements and fleet node state.
   */
  public selectPlacement(req: TaskDispatchRequirements): TaskPlacementDecision {
    const availableNodes = this.healthMonitor.getAvailableNodes();

    if (availableNodes.length === 0) {
      return {
        nodeId: this.localNodeId,
        isLocal: true,
        reason: "No remote fleet nodes available; falling back to local orchestrator."
      };
    }

    const estimatedVram = req.estimatedVramMb ?? this.estimateModelVram(req.model);

    // Filter nodes capable of hosting the estimated VRAM
    const candidates = availableNodes.filter((node) => {
      const freeVram = Math.max(0, node.vramTotalMb - node.vramUsedMb);
      // For GPU nodes, check free VRAM; for CPU_ONLY, accept if not overloaded
      if (node.gpuType === "CPU_ONLY") {
        return estimatedVram <= 4096;
      }
      return freeVram >= estimatedVram;
    });

    if (candidates.length === 0) {
      // Fallback to least busy available node
      const sortedByLoad = [...availableNodes].sort(
        (a, b) => a.activeTasksCount - b.activeTasksCount || a.temperatureCelsius - b.temperatureCelsius
      );
      const fallback = sortedByLoad[0]!;
      return {
        nodeId: fallback.nodeId,
        isLocal: fallback.nodeId === this.localNodeId,
        targetHost: fallback.ipAddress,
        targetPort: fallback.port,
        reason: `Insufficient dedicated VRAM for ${estimatedVram}MB; selected node with lowest active load.`
      };
    }

    // Select candidate with highest free VRAM and lowest temperature
    candidates.sort((a, b) => {
      const freeA = a.vramTotalMb - a.vramUsedMb;
      const freeB = b.vramTotalMb - b.vramUsedMb;
      if (freeA !== freeB) {
        return freeB - freeA; // Descending free VRAM
      }
      return a.temperatureCelsius - b.temperatureCelsius; // Ascending temperature
    });

    const chosen = candidates[0]!;
    return {
      nodeId: chosen.nodeId,
      isLocal: chosen.nodeId === this.localNodeId,
      targetHost: chosen.ipAddress,
      targetPort: chosen.port,
      reason: `Routed to node with ${chosen.vramTotalMb - chosen.vramUsedMb}MB free VRAM and ${chosen.temperatureCelsius}C temperature.`
    };
  }

  /**
   * Migrates a task away from a node reporting thermal throttling.
   */
  public migrateTask(taskId: string, currentNodeId: string, model: string): TaskPlacementDecision | null {
    const requiredVram = this.estimateModelVram(model);
    const availableNodes = this.healthMonitor
      .getAvailableNodes()
      .filter((n) => {
        if (n.nodeId === currentNodeId || n.status === "DEGRADED") return false;
        const freeVram = Math.max(0, n.vramTotalMb - n.vramUsedMb);
        return n.gpuType === "CPU_ONLY" ? requiredVram <= 4096 : freeVram >= requiredVram;
      });

    if (availableNodes.length === 0) {
      return null;
    }

    // Sort by lowest thermal metric
    availableNodes.sort((a, b) => a.temperatureCelsius - b.temperatureCelsius);
    const destination = availableNodes[0]!;

    return {
      nodeId: destination.nodeId,
      isLocal: destination.nodeId === this.localNodeId,
      targetHost: destination.ipAddress,
      targetPort: destination.port,
      reason: `Migrated task ${taskId} from throttling node ${currentNodeId} to cooler node ${destination.nodeId} (${destination.temperatureCelsius}C).`
    };
  }

  /**
   * Heuristic estimation of model VRAM requirements in MB.
   */
  private estimateModelVram(model: string): number {
    const lower = model.toLowerCase();
    if (lower.includes("32b") || lower.includes("30b")) {
      return 20480;
    }
    if (lower.includes("14b") || lower.includes("16b")) {
      return 10240;
    }
    if (lower.includes("7b") || lower.includes("8b")) {
      return 6144;
    }
    if (lower.includes("3b") || lower.includes("1.5b")) {
      return 3072;
    }
    return 4096;
  }
}
