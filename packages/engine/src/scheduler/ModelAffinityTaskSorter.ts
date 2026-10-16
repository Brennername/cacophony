import type { TaskRecord } from "@cacophony/shared-types";

/**
 * ModelAffinityTaskSorter
 *
 * Sorts pending arena tasks to optimize throughput on the single-concurrency Vega APU.
 * Prioritizes tasks that match the currently loaded Ollama model in VRAM to eliminate
 * redundant 20-40 second model eviction/reload delays, while strictly respecting P0 emergency
 * priority and preventing task starvation via age-based auto-escalation.
 */
export class ModelAffinityTaskSorter {
  private readonly maxWaitSeconds: number;

  constructor(maxWaitSeconds = 3600) {
    this.maxWaitSeconds = maxWaitSeconds;
  }

  /**
   * Sorts tasks in optimal execution order.
   *
   * @param tasks List of pending tasks
   * @param currentlyLoadedModel Model currently loaded in Ollama VRAM (if any)
   */
  public sort(
    tasks: readonly TaskRecord[],
    currentlyLoadedModel: string | null,
  ): readonly TaskRecord[] {
    const now = Date.now();

    return [...tasks].sort((a, b) => {
      // 1. Evaluate effective priority tiers:
      // Explicit P0 is rank 0.
      // Auto-escalated starved tasks are rank 1.
      // Normal P1 is rank 2.
      // Normal P2 is rank 3.
      const rankA = this.getPriorityRank(a, now);
      const rankB = this.getPriorityRank(b, now);

      // Explicit P0 emergency tasks take absolute precedence over everything else
      if (rankA === 0 && rankB !== 0) return -1;
      if (rankB === 0 && rankA !== 0) return 1;

      // Both are explicit P0: FIFO age ordering
      if (rankA === 0 && rankB === 0) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      // Auto-escalated starved tasks (rank 1) preempt non-starved tasks (rank >= 2)
      // even if a non-starved task matches the currently loaded model
      if (rankA === 1 && rankB > 1) return -1;
      if (rankB === 1 && rankA > 1) return 1;

      // 2. Model Affinity: Within the same tier (e.g. between normal tasks or between starved tasks),
      // if one task matches the active VRAM model, prioritize it to eliminate model switch latency
      if (currentlyLoadedModel) {
        const aMatches = a.modelAssigned === currentlyLoadedModel;
        const bMatches = b.modelAssigned === currentlyLoadedModel;
        if (aMatches && !bMatches) return -1;
        if (bMatches && !aMatches) return 1;
      }

      // 3. Priority tier (P1 before P2)
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 4. Age ordering: oldest tasks first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  private getPriorityRank(task: TaskRecord, nowMs: number): number {
    // Explicit operator emergency priority
    if (task.priority === "P0") {
      return 0;
    }

    const createdMs = new Date(task.createdAt).getTime();
    const ageSeconds = Math.max(0, (nowMs - createdMs) / 1000);

    // Aging tasks auto-escalate to prevent indefinite starvation behind newer tasks
    if (ageSeconds >= this.maxWaitSeconds) {
      return 1;
    }

    switch (task.priority) {
      case "P1":
        return 2;
      case "P2":
        return 3;
      default:
        return 4;
    }
  }
}
