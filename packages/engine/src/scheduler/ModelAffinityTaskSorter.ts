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
  public sort(tasks: readonly TaskRecord[], currentlyLoadedModel: string | null): readonly TaskRecord[] {
    const now = Date.now();

    return [...tasks].sort((a, b) => {
      // 1. Starvation auto-escalation: evaluate effective priority
      const effA = this.getEffectivePriority(a, now);
      const effB = this.getEffectivePriority(b, now);

      // P0 tasks take absolute precedence
      if (effA === "P0" && effB !== "P0") return -1;
      if (effB === "P0" && effA !== "P0") return 1;

      // 2. Model Affinity: If one task matches the active VRAM model, prioritize it
      if (currentlyLoadedModel) {
        const aMatches = a.modelAssigned === currentlyLoadedModel;
        const bMatches = b.modelAssigned === currentlyLoadedModel;
        if (aMatches && !bMatches) return -1;
        if (bMatches && !aMatches) return 1;
      }

      // 3. Priority tier (P1 before P2)
      const rankA = this.getPriorityRank(effA);
      const rankB = this.getPriorityRank(effB);
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 4. Age ordering: oldest tasks first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  private getEffectivePriority(task: TaskRecord, nowMs: number): string {
    if (task.priority === "P0") return "P0";
    const createdMs = new Date(task.createdAt).getTime();
    const ageSeconds = Math.max(0, (nowMs - createdMs) / 1000);
    if (ageSeconds >= this.maxWaitSeconds) {
      return "P0"; // Auto-escalate to prevent starvation
    }
    return task.priority;
  }

  private getPriorityRank(priority: string): number {
    switch (priority) {
      case "P0":
        return 0;
      case "P1":
        return 1;
      case "P2":
        return 2;
      default:
        return 3;
    }
  }
}
