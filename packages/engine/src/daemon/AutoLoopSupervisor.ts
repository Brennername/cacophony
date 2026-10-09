import type { TaskRecord } from "@cacophony/shared-types";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface AutoLoopSupervisorOptions {
  readonly pollIntervalMs?: number | undefined;
  readonly maxConsecutiveCrashes?: number | undefined;
  readonly vacancyFillEnabled?: boolean | undefined;
}

export interface AutoLoopSupervisorState {
  readonly isRunning: boolean;
  readonly consecutiveCrashes: number;
  readonly totalErrorsHandled: number;
  readonly vacancyTasksCreated: number;
  readonly lastErrorTimestamp?: string | undefined;
}

/**
 * AutoLoopSupervisor
 *
 * Implements 24/7 continuous autonomous loop supervision (Phase 84 T84.1).
 * Isolates unhandled worker rejections, executes transactional worktree rollbacks,
 * and maintains continuous queue ingestion by creating vacancy fill tasks when idle.
 */
export class AutoLoopSupervisor {
  private isRunning = false;
  private consecutiveCrashes = 0;
  private totalErrorsHandled = 0;
  private vacancyTasksCreated = 0;
  private lastErrorTimestamp?: string | undefined;
  private timerHandle?: NodeJS.Timeout | undefined;

  private readonly pollIntervalMs: number;
  private readonly maxConsecutiveCrashes: number;
  private readonly vacancyFillEnabled: boolean;

  constructor(
    private readonly taskRepo: {
      listPending: () => Promise<readonly TaskRecord[]>;
      createIfNotExists: (task: TaskRecord) => Promise<{ created: boolean; task: TaskRecord }>;
      updateStatus: (id: string, status: any) => Promise<void>;
    },
    options?: AutoLoopSupervisorOptions
  ) {
    this.pollIntervalMs = options?.pollIntervalMs ?? 5000;
    this.maxConsecutiveCrashes = options?.maxConsecutiveCrashes ?? 10;
    this.vacancyFillEnabled = options?.vacancyFillEnabled ?? true;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.consecutiveCrashes = 0;
    this.scheduleNextTick();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = undefined;
    }
  }

  public getState(): AutoLoopSupervisorState {
    return {
      isRunning: this.isRunning,
      consecutiveCrashes: this.consecutiveCrashes,
      totalErrorsHandled: this.totalErrorsHandled,
      vacancyTasksCreated: this.vacancyTasksCreated,
      lastErrorTimestamp: this.lastErrorTimestamp
    };
  }

  /**
   * Catches and isolates unhandled worker/task execution rejections,
   * rolls back worktree, transitions task to FAILED, and prevents queue death.
   */
  public async handleWorkerError(taskId: string, error: Error, worktreePath?: string): Promise<void> {
    this.totalErrorsHandled++;
    this.consecutiveCrashes++;
    this.lastErrorTimestamp = new Date().toISOString();

    if (this.consecutiveCrashes >= this.maxConsecutiveCrashes) {
      console.warn(`[AutoLoopSupervisor] Consecutive crashes reached ceiling (${this.maxConsecutiveCrashes}).`);
    }

    console.warn(`[AutoLoopSupervisor] Handled worker failure on task '${taskId}': ${error.message}`);

    // Rollback worktree if provided
    if (worktreePath) {
      try {
        await execAsync(`git -C "${worktreePath}" checkout -f HEAD && git -C "${worktreePath}" clean -fd`, { timeout: 10000 });
        console.log(`[AutoLoopSupervisor] Cleaned and reset worktree at '${worktreePath}'`);
      } catch (err: any) {
        console.warn(`[AutoLoopSupervisor] Worktree rollback warning: ${err?.message}`);
      }
    }

    // Fail task safely
    try {
      await this.taskRepo.updateStatus(taskId, "FAILED");
    } catch {
      // Non-fatal
    }
  }

  /**
   * Generates a maintenance or test-expansion vacancy task when the queue is empty.
   */
  public async fillVacancy(): Promise<TaskRecord | null> {
    if (!this.vacancyFillEnabled) return null;

    const vacancyId = `vacancy-${Date.now()}`;
    const titles = [
      "Expand unit test coverage for core edge cases",
      "Prune unused AST import specifiers and re-export trees",
      "Validate zero-emoji compliance across test manifests",
      "Audit SOLID interface segregation in service layer"
    ];
    const pickedTitle = titles[this.vacancyTasksCreated % titles.length]!;

    const taskRecord: TaskRecord = {
      id: vacancyId,
      title: pickedTitle,
      prompt: `[VACANCY TASK]: ${pickedTitle}\nVerify production invariants and clean unused bindings.`,
      role: "test_engineer",
      status: "PENDING",
      priority: "P2",
      modelAssigned: null,
      testCommand: "npm test",
      focusFiles: "packages/engine/src/testing/",
      targetBranch: "main",
      prUrl: null,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };

    const res = await this.taskRepo.createIfNotExists(taskRecord);
    if (res.created) {
      this.vacancyTasksCreated++;
      return res.task;
    }
    return null;
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;
    this.timerHandle = setTimeout(async () => {
      try {
        const pending = await this.taskRepo.listPending();
        if (pending.length === 0) {
          await this.fillVacancy();
        } else {
          // Reset consecutive crashes on healthy queue state
          if (this.consecutiveCrashes > 0) {
            this.consecutiveCrashes = 0;
          }
        }
      } catch (err: any) {
        console.warn(`[AutoLoopSupervisor] Tick warning: ${err?.message}`);
      } finally {
        this.scheduleNextTick();
      }
    }, this.pollIntervalMs);
  }
}
