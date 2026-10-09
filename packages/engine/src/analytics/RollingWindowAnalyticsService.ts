import type {
  IRollingWindowConfig,
  IRollingWindowMetrics,
  IWindowQualificationFilter,
  TaskRecord,
} from "@cacophony/shared-types";
import { ConvergenceAnalyzer } from "./ConvergenceAnalyzer.js";

export interface ITaskHistorySource {
  listRecent(limit?: number, filter?: { status?: string }): Promise<readonly TaskRecord[]>;
}

/**
 * RollingWindowAnalyticsService
 *
 * Evaluates contiguous time-series execution windows filtered across multiple
 * dimensions (agent role, model identifier, task category, and git commit hash).
 * Computes windowed success rates, calculus derivatives, and plateau convergence.
 */
export class RollingWindowAnalyticsService {
  private readonly taskSource: ITaskHistorySource;

  constructor(taskSource: ITaskHistorySource) {
    this.taskSource = taskSource;
  }

  /**
   * Computes dynamic rolling window metrics based on configuration and filter criteria.
   */
  public async computeRollingMetrics(config: IRollingWindowConfig): Promise<IRollingWindowMetrics> {
    const windowSize = Math.max(1, config.windowSize);
    const minSampleSize = config.minSampleSize ?? 2;
    const filter: IWindowQualificationFilter = config.filter ?? {};

    // Fetch pool of finished tasks (oversampling to allow post-filtering)
    const fetchLimit = Math.max(windowSize * 5, 200);
    const allRecent = await this.taskSource.listRecent(fetchLimit);

    // Filter to terminal tasks (COMPLETED or FAILED) matching qualification filter
    const qualifiedTasks = allRecent.filter((task) => {
      if (task.status !== "COMPLETED" && task.status !== "FAILED") {
        return false;
      }
      if (filter.role && task.role !== filter.role) {
        return false;
      }
      if (filter.model && task.modelAssigned !== filter.model) {
        return false;
      }
      if (filter.commitHash && task.targetBranch !== filter.commitHash && !task.prompt.includes(filter.commitHash)) {
        return false;
      }
      if (filter.category && !task.title.toLowerCase().includes(filter.category.toLowerCase())) {
        return false;
      }
      return true;
    });

    // Window slice: newest tasks up to windowSize
    const windowSlice = qualifiedTasks.slice(0, windowSize);
    const sampleCount = windowSlice.length;

    if (sampleCount < minSampleSize) {
      return {
        windowSize,
        sampleCount,
        successCount: windowSlice.filter((t) => t.status === "COMPLETED").length,
        failureCount: windowSlice.filter((t) => t.status === "FAILED").length,
        successRatePercent: sampleCount === 0 ? 100.0 : Number(((windowSlice.filter((t) => t.status === "COMPLETED").length / sampleCount) * 100).toFixed(1)),
        velocityDelta: 0.0,
        accelerationDelta: 0.0,
        isPlateaued: false,
        filteredBy: filter,
      };
    }

    const successCount = windowSlice.filter((t) => t.status === "COMPLETED").length;
    const failureCount = sampleCount - successCount;
    const successRatePercent = Number(((successCount / sampleCount) * 100).toFixed(1));

    // Calculate rates for derivative calculation (slice into chronologically ordered sub-windows)
    const rates: number[] = [];
    const stepSize = Math.max(1, Math.floor(sampleCount / 3));
    for (let i = sampleCount; i >= stepSize; i -= stepSize) {
      const sub = windowSlice.slice(0, i);
      const subSuccess = sub.filter((t) => t.status === "COMPLETED").length;
      rates.unshift(Number(((subSuccess / sub.length) * 100).toFixed(1)));
    }

    const { velocityDelta, accelerationDelta } = ConvergenceAnalyzer.calculateDerivatives(rates);

    // Compute nested short vs long window plateau check
    const shortWindowCount = Math.min(10, sampleCount);
    const shortSlice = windowSlice.slice(0, shortWindowCount);
    const shortRate = Number(((shortSlice.filter((t) => t.status === "COMPLETED").length / shortWindowCount) * 100).toFixed(1));
    const { isPlateaued } = ConvergenceAnalyzer.detectPlateau(shortRate, successRatePercent, 2.5);

    const newestTaskTimestamp = windowSlice[0]?.completedAt ?? windowSlice[0]?.updatedAt;
    const oldestTaskTimestamp = windowSlice[windowSlice.length - 1]?.completedAt ?? windowSlice[windowSlice.length - 1]?.updatedAt;

    const result: IRollingWindowMetrics = {
      windowSize,
      sampleCount,
      successCount,
      failureCount,
      successRatePercent,
      velocityDelta,
      accelerationDelta,
      isPlateaued,
      filteredBy: filter,
    };
    if (oldestTaskTimestamp) {
      (result as any).oldestTaskTimestamp = oldestTaskTimestamp;
    }
    if (newestTaskTimestamp) {
      (result as any).newestTaskTimestamp = newestTaskTimestamp;
    }

    return result;
  }
}
