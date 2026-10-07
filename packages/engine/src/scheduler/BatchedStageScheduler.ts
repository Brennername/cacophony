import type { TaskRecord } from "@cacophony/shared-types";

export interface BatchedScheduleDecision {
  readonly task: TaskRecord;
  readonly modelToUse: string;
  readonly isBatchedAffinity: boolean;
  readonly batchIndex: number;
  readonly reason: string;
}

export interface BatchedStageSchedulerOptions {
  readonly maxBatchWindow?: number | undefined;
  readonly heavyModelKeywords?: readonly string[] | undefined;
}

/**
 * BatchedStageScheduler
 *
 * Maximizes GPU/APU throughput by batch-dispatching tasks matching the model
 * currently resident in VRAM (up to maxBatchWindow tasks, default 5) before
 * permitting costly model unloads or context swaps in Ollama.
 */
export class BatchedStageScheduler {
  private readonly maxBatchWindow: number;
  private readonly heavyModelKeywords: readonly string[];

  private currentResidentModel: string | null = null;
  private currentBatchCount = 0;

  constructor(options: BatchedStageSchedulerOptions = {}) {
    this.maxBatchWindow = options.maxBatchWindow ?? 5;
    this.heavyModelKeywords = options.heavyModelKeywords ?? ["14b", "16b", "32b", "r1", "8b"];
  }

  /**
   * Evaluates pending tasks and returns the optimal next task to execute, prioritizing
   * resident VRAM affinity while respecting priority preemption.
   */
  public selectNextTask(
    pendingTasks: readonly TaskRecord[],
    activeVramModel: string | null
  ): BatchedScheduleDecision | null {
    if (pendingTasks.length === 0) {
      this.resetBatch();
      return null;
    }

    // Always respect P0 emergency tasks immediately
    const p0Tasks = pendingTasks.filter((t) => t.priority === "P0");
    if (p0Tasks.length > 0) {
      const topP0 = p0Tasks[0]!;
      const assigned = topP0.modelAssigned || activeVramModel || "qwen2.5-coder:7b";
      this.updateResident(assigned);
      return {
        task: topP0,
        modelToUse: assigned,
        isBatchedAffinity: false,
        batchIndex: 1,
        reason: "Preempted by critical P0 task",
      };
    }

    const currentModel = activeVramModel || this.currentResidentModel;

    // Check if we have an active resident model with remaining batch budget
    if (currentModel && this.currentBatchCount < this.maxBatchWindow) {
      // Find candidate tasks that can run on the resident model
      const affinityTask = pendingTasks.find((t) => {
        if (t.modelAssigned && t.modelAssigned === currentModel) return true;
        if (!t.modelAssigned) {
          // Unassigned tasks can be batched to resident model if it matches role capability
          return true;
        }
        return false;
      });

      if (affinityTask) {
        this.currentBatchCount++;
        this.currentResidentModel = currentModel;
        return {
          task: affinityTask,
          modelToUse: currentModel,
          isBatchedAffinity: true,
          batchIndex: this.currentBatchCount,
          reason: `VRAM affinity batch (${this.currentBatchCount}/${this.maxBatchWindow}) on resident model '${currentModel}'`,
        };
      }
    }

    // Otherwise, start a new batch window with the highest priority available task
    const nextTask = this.pickNextByPriority(pendingTasks);
    if (!nextTask) return null;

    const targetModel = nextTask.modelAssigned || currentModel || "qwen2.5-coder:7b";
    this.currentResidentModel = targetModel;
    this.currentBatchCount = 1;

    return {
      task: nextTask,
      modelToUse: targetModel,
      isBatchedAffinity: false,
      batchIndex: 1,
      reason: `Started new execution batch on model '${targetModel}'`,
    };
  }

  /**
   * Identifies whether a given model identifier qualifies as a heavy compute model.
   */
  public isHeavyModel(modelName: string): boolean {
    const lower = modelName.toLowerCase();
    return this.heavyModelKeywords.some((keyword) => lower.includes(keyword));
  }

  public getCurrentBatchCount(): number {
    return this.currentBatchCount;
  }

  public getCurrentResidentModel(): string | null {
    return this.currentResidentModel;
  }

  public resetBatch(newModel: string | null = null): void {
    this.currentResidentModel = newModel;
    this.currentBatchCount = 0;
  }

  private updateResident(model: string): void {
    if (this.currentResidentModel !== model) {
      this.currentResidentModel = model;
      this.currentBatchCount = 1;
    } else {
      this.currentBatchCount++;
    }
  }

  private pickNextByPriority(tasks: readonly TaskRecord[]): TaskRecord | null {
    if (tasks.length === 0) return null;
    const sorted = [...tasks].sort((a, b) => {
      const pOrder = { P0: 0, P1: 1, P2: 2 };
      const diff = (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
      if (diff !== 0) return diff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return sorted[0] || null;
  }
}
