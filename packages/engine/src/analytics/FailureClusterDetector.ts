/**
 * FailureClusterDetector
 *
 * Analyzes moving windows of task completions to detect systemic regressions:
 * triggers a REGRESSION_BURST_ALERT when high-density or consecutive failures occur
 * across two or more distinct models within a sliding window.
 */

export interface TaskOutcome {
  readonly taskId: string;
  readonly modelId: string;
  readonly status: "COMPLETED" | "FAILED" | "REMEDIATED";
  readonly timestamp: number;
  readonly prompt?: string | undefined;
  readonly errorDetails?: string | undefined;
  readonly exitCode?: number | undefined;
}

export interface RegressionBurstAlert {
  readonly alertId: string;
  readonly windowSize: number;
  readonly totalTasksInWindow: number;
  readonly failureCount: number;
  readonly distinctModels: readonly string[];
  readonly failingTasks: readonly TaskOutcome[];
  readonly timestamp: number;
  readonly reason: string;
}

export interface FailureClusterDetectorOptions {
  readonly windowSize?: number | undefined;
  readonly minFailuresForBurst?: number | undefined;
  readonly minDistinctModels?: number | undefined;
  readonly minConsecutiveFailures?: number | undefined;
}

export class FailureClusterDetector {
  private readonly windowSize: number;
  private readonly minFailuresForBurst: number;
  private readonly minDistinctModels: number;
  private readonly minConsecutiveFailures: number;

  private readonly slidingWindow: TaskOutcome[] = [];
  private activeAlert: RegressionBurstAlert | null = null;

  constructor(options: FailureClusterDetectorOptions = {}) {
    this.windowSize = options.windowSize ?? 10;
    this.minFailuresForBurst = options.minFailuresForBurst ?? 4;
    this.minDistinctModels = options.minDistinctModels ?? 2;
    this.minConsecutiveFailures = options.minConsecutiveFailures ?? 3;
  }

  /**
   * Records a task completion outcome and evaluates the sliding window for failure bursts.
   * Returns a RegressionBurstAlert if a new burst condition is detected, or null otherwise.
   */
  public recordTaskOutcome(outcome: TaskOutcome): RegressionBurstAlert | null {
    this.slidingWindow.push(outcome);
    if (this.slidingWindow.length > this.windowSize) {
      this.slidingWindow.shift();
    }

    const alert = this.evaluateBurstCondition();
    if (alert) {
      this.activeAlert = alert;
      return alert;
    }

    return null;
  }

  /**
   * Evaluates current sliding window state against burst thresholds.
   */
  public evaluateBurstCondition(): RegressionBurstAlert | null {
    if (this.slidingWindow.length < 3) {
      return null;
    }

    const failingTasks = this.slidingWindow.filter((t) => t.status === "FAILED");
    const distinctFailingModels = Array.from(new Set(failingTasks.map((t) => t.modelId)));

    // Multi-model requirement: failures must span at least minDistinctModels to prove systemic regression
    const isMultiModel = distinctFailingModels.length >= this.minDistinctModels;

    // Check 1: High density failures in window
    const isHighDensity = failingTasks.length >= this.minFailuresForBurst && isMultiModel;

    // Check 2: Consecutive failure streak ending with the latest task
    let consecutiveCount = 0;
    for (let i = this.slidingWindow.length - 1; i >= 0; i--) {
      if (this.slidingWindow[i]?.status === "FAILED") {
        consecutiveCount++;
      } else {
        break;
      }
    }

    const recentFailingModels = Array.from(
      new Set(
        this.slidingWindow
          .slice(-consecutiveCount)
          .filter((t) => t.status === "FAILED")
          .map((t) => t.modelId)
      )
    );
    const isConsecutiveBurst =
      consecutiveCount >= this.minConsecutiveFailures &&
      recentFailingModels.length >= this.minDistinctModels;

    if (isHighDensity || isConsecutiveBurst) {
      const reason = isConsecutiveBurst
        ? `Consecutive failure streak of ${consecutiveCount} tasks across ${recentFailingModels.length} distinct models`
        : `High failure density: ${failingTasks.length}/${this.slidingWindow.length} failed across ${distinctFailingModels.length} distinct models`;

      return {
        alertId: `burst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        windowSize: this.windowSize,
        totalTasksInWindow: this.slidingWindow.length,
        failureCount: failingTasks.length,
        distinctModels: distinctFailingModels,
        failingTasks,
        timestamp: Date.now(),
        reason,
      };
    }

    return null;
  }

  /**
   * Returns read-only slice of recent outcomes currently in sliding window.
   */
  public getRecentOutcomes(): readonly TaskOutcome[] {
    return [...this.slidingWindow];
  }

  /**
   * Checks whether a regression burst condition is currently active.
   */
  public isBurstActive(): boolean {
    return this.activeAlert !== null;
  }

  /**
   * Gets the active alert details if present.
   */
  public getActiveAlert(): RegressionBurstAlert | null {
    return this.activeAlert;
  }

  /**
   * Clears the active burst alert once remediations or investigation begin.
   */
  public acknowledgeAlert(): void {
    this.activeAlert = null;
  }

  /**
   * Resets sliding window state.
   */
  public reset(): void {
    this.slidingWindow.length = 0;
    this.activeAlert = null;
  }
}
