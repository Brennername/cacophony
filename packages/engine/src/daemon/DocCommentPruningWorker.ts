import type { DocCommentCandidateRepository } from "@cacophony/db";

export interface DocCommentPruningWorkerOptions {
  readonly intervalMs?: number | undefined;
  readonly retentionDays?: number | undefined;
}

export interface DocCommentPruningWorkerState {
  readonly isRunning: boolean;
  readonly lastPruneTimestamp?: string | undefined;
  readonly totalPrunedCandidates: number;
  readonly lastPrunedCount: number;
}

/**
 * DocCommentPruningWorker
 *
 * Background maintenance service that routinely purges discarded function
 * doc-comment drafts older than the configured retention threshold (default: 7 days).
 * Accepted candidates are permanently preserved for audit and attribution.
 */
export class DocCommentPruningWorker {
  private isRunning = false;
  private timerHandle?: NodeJS.Timeout | undefined;
  private lastPruneTimestamp?: string | undefined;
  private totalPrunedCandidates = 0;
  private lastPrunedCount = 0;

  private readonly intervalMs: number;
  private readonly retentionDays: number;

  constructor(
    private readonly repository: Pick<
      DocCommentCandidateRepository,
      "pruneDiscardedCandidates"
    >,
    options?: DocCommentPruningWorkerOptions,
  ) {
    this.intervalMs = options?.intervalMs ?? 60 * 60 * 1000; // default 1 hour
    this.retentionDays = options?.retentionDays ?? 7; // default 7 days
  }

  /**
   * Starts periodic pruning routine.
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.scheduleNextTick();
  }

  /**
   * Stops periodic pruning routine.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = undefined;
    }
  }

  /**
   * Manually runs a pruning pass immediately.
   */
  public async runPruneNow(): Promise<number> {
    try {
      const pruned = await this.repository.pruneDiscardedCandidates(
        this.retentionDays,
      );
      this.lastPruneTimestamp = new Date().toISOString();
      this.lastPrunedCount = pruned;
      this.totalPrunedCandidates += pruned;
      return pruned;
    } catch (error) {
      // Record error timestamp and preserve worker loop resilience
      this.lastPruneTimestamp = new Date().toISOString();
      return 0;
    }
  }

  /**
   * Returns current worker telemetry state.
   */
  public getState(): DocCommentPruningWorkerState {
    return {
      isRunning: this.isRunning,
      lastPruneTimestamp: this.lastPruneTimestamp,
      totalPrunedCandidates: this.totalPrunedCandidates,
      lastPrunedCount: this.lastPrunedCount,
    };
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) {
      return;
    }
    this.timerHandle = setTimeout(async () => {
      await this.runPruneNow();
      this.scheduleNextTick();
    }, this.intervalMs);
  }
}
