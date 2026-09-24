import type { TaskRepository, StageRepository } from "@cacophony/db";
import type { TaskRecord, AgentRole, TaskPriority } from "@cacophony/shared-types";
import type { FrontierTaskDecomposer } from "./FrontierTaskDecomposer.js";

export interface TaskcadeBacklogObjective {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly targetWorkspacePkg?: string;
  readonly priority: TaskPriority;
}

export interface ReplenishmentResult {
  readonly replenished: boolean;
  readonly tasksCreatedCount: number;
  readonly currentPendingCount: number;
  readonly createdTasks: readonly TaskRecord[];
}

/**
 * TaskcadePlanningService
 *
 * Provides database-native taskcade management:
 * 1. Maintains backlog of high-level architectural milestones.
 * 2. Monitors active pending queue depth in PGlite.
 * 3. When pending count drops below threshold, triggers autonomous task decomposition
 *    via FrontierTaskDecomposer or Ollama to replenish the queue with concrete tasks.
 * 4. Enables the system to groom and execute its own taskcade without stopping.
 */
export class TaskcadePlanningService {
  private readonly taskRepo: TaskRepository;
  private readonly stageRepo?: StageRepository | undefined;
  private readonly decomposer?: FrontierTaskDecomposer | undefined;
  private readonly backlog: TaskcadeBacklogObjective[] = [];

  constructor(options: {
    readonly taskRepo: TaskRepository;
    readonly stageRepo?: StageRepository | undefined;
    readonly decomposer?: FrontierTaskDecomposer | undefined;
    readonly initialBacklog?: readonly TaskcadeBacklogObjective[] | undefined;
  }) {
    this.taskRepo = options.taskRepo;
    this.stageRepo = options.stageRepo;
    this.decomposer = options.decomposer;
    if (options.initialBacklog) {
      this.backlog.push(...options.initialBacklog);
    }
  }

  public getStageRepository(): StageRepository | undefined {
    return this.stageRepo;
  }

  /**
   * Adds high-level objectives to the in-memory/database backlog.
   */

  public enqueueObjective(objective: TaskcadeBacklogObjective): void {
    this.backlog.push(objective);
  }

  /**
   * Returns remaining backlog items awaiting decomposition.
   */
  public getBacklog(): readonly TaskcadeBacklogObjective[] {
    return this.backlog;
  }

  /**
   * Evaluates queue depth and replenishes pending arena tasks if below minQueueDepth.
   */
  public async replenishQueueIfLow(options: {
    readonly minQueueDepth?: number | undefined;
    readonly modelName?: string | undefined;
    readonly maxDecomposePerCycle?: number | undefined;
  } = {}): Promise<ReplenishmentResult> {
    const minDepth = options.minQueueDepth ?? 3;
    const model = options.modelName ?? "qwen2.5-coder:3b";
    const pending = await this.taskRepo.listPending();

    if (pending.length >= minDepth) {
      return {
        replenished: false,
        tasksCreatedCount: 0,
        currentPendingCount: pending.length,
        createdTasks: []
      };
    }

    if (this.backlog.length === 0) {
      return {
        replenished: false,
        tasksCreatedCount: 0,
        currentPendingCount: pending.length,
        createdTasks: []
      };
    }

    const nextObjective = this.backlog.shift()!;
    const created: TaskRecord[] = [];

    if (this.decomposer) {
      try {
        const decomposed = await this.decomposer.decomposeAndPersist(
          `${nextObjective.title}\n${nextObjective.description}`,
          model,
          nextObjective.targetWorkspacePkg ? `Target Package: ${nextObjective.targetWorkspacePkg}` : ""
        );
        created.push(...decomposed);
      } catch {
        // Fallback: create direct task if LLM decomposition fails
        const directTask = await this.createDirectTask(nextObjective);
        created.push(directTask);
      }
    } else {
      const directTask = await this.createDirectTask(nextObjective);
      created.push(directTask);
    }

    const updatedPending = await this.taskRepo.listPending();

    return {
      replenished: true,
      tasksCreatedCount: created.length,
      currentPendingCount: updatedPending.length,
      createdTasks: created
    };
  }

  private async createDirectTask(objective: TaskcadeBacklogObjective): Promise<TaskRecord> {
    const now = new Date().toISOString();
    const task: TaskRecord = {
      id: `task-${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: objective.title,
      prompt: objective.description,
      role: "implementer" as AgentRole,
      status: "PENDING",
      priority: objective.priority,
      modelAssigned: null,
      testCommand: "npm test",
      focusFiles: null,
      targetBranch: null,
      prUrl: null,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };

    await this.taskRepo.create(task);
    return task;
  }
}
