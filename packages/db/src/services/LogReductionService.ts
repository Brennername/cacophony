import type { IDatabaseDriver } from "../interfaces/IDatabaseDriver.js";

/**
 * Empirical Stage Log Size Weights & Typical Storage Ratios:
 *
 * In the Cacophony autonomous loop, different pipeline stages produce drastically
 * disparate log output sizes. Documenting and tuning these ratios allows selective,
 * non-aggressive rotation:
 *
 * 1. test_execution (~50x weight):
 *    - Typical size: 10 KB to 256 KB per run.
 *    - Cause: Vitest / test runners output entire ANSI traces, assertion diffs, and module stacks.
 *    - Multiplied repeatedly by remediation iterations.
 *    - Reduction Priority: 1 (Highest priority to collapse into statistical histogram).
 *
 * 2. generation (~20x weight):
 *    - Typical size: 4 KB to 60 KB per run.
 *    - Cause: Full file completions, code blocks, diff attempts, and reasoning preamble.
 *    - Reduction Priority: 2 (Collapse superseded/failed attempts; retain final attempt if desired).
 *
 * 3. remediation (~8x weight):
 *    - Typical size: 2 KB to 20 KB per run.
 *    - Cause: Code review markdown, SOLID assessments, gate evaluation reports.
 *    - Reduction Priority: 3 (Collapse on retired/archived tasks).
 *
 * 4. deterministic_scrub (~1x weight):
 *    - Typical size: 0.2 KB to 2 KB per run.
 *    - Cause: Compact AST diffs, symbol import cleanups, formatting lint repairs.
 *    - "Short and sweet": Accumulates very little storage.
 *    - Reduction Priority: 4 (Preserve intact by default).
 *
 * 5. planning (~0.5x weight):
 *    - Typical size: 0.1 KB to 1.5 KB per run.
 *    - Cause: Focus file directives, task objective summary.
 *    - "Short and sweet": Negligible storage footprint.
 *    - Reduction Priority: 5 (Preserve intact by default).
 */
export const STAGE_SIZE_RATIOS: Record<string, number> = {
  test_execution: 50,
  generation: 20,
  remediation: 8,
  deterministic_scrub: 1,
  planning: 0.5,
};

export interface StageHistogramMetrics {
  readonly stageId: number;
  readonly stageName: string;
  readonly attemptNumber: number;
  readonly stageStatus: string;
  readonly durationMs: number;
  readonly durationBucket: "<1s" | "1-5s" | "5-15s" | "15-60s" | ">60s";
  readonly tokensSent: number;
  readonly tokensReceived: number;
  readonly originalBytes: number;
  readonly lineCount: number;
  readonly reducedBytes: number;
  readonly reclaimedBytes: number;
}

export interface TaskStatisticalHistogram {
  readonly taskId: string;
  readonly taskTitle: string;
  readonly totalStages: number;
  readonly stagesReduced: number;
  readonly originalLogBytes: number;
  readonly reducedLogBytes: number;
  readonly reclaimedBytes: number;
  readonly reclaimedPct: number;
  readonly durationBuckets: Record<"<1s" | "1-5s" | "5-15s" | "15-60s" | ">60s", number>;
  readonly statusDistribution: Record<string, number>;
  readonly stageTypeDistribution: Record<string, number>;
  readonly tokenSummary: {
    readonly totalSent: number;
    readonly totalReceived: number;
  };
  readonly stageHistograms: readonly StageHistogramMetrics[];
}

export interface ReductionLogRecord {
  readonly id: number;
  readonly taskId: string;
  readonly reducedAt: string;
  readonly stagesReduced: number;
  readonly originalBytes: number;
  readonly reducedBytes: number;
  readonly reclaimedBytes: number;
  readonly reductionReason: string;
  readonly histogramData: string;
}

export interface LogReductionConfig {
  readonly driver: IDatabaseDriver;
  readonly maxStorageThresholdBytes?: number; // Defaults to 250 MB
  readonly minTaskAgeDays?: number; // Generous retention: only reduce tasks finished > 3 days ago
  readonly preserveRecentTasksCount?: number; // Never reduce the N most recent tasks (default 20)
  readonly preserveLightweightStages?: boolean; // Preserve deterministic_scrub and planning (default true)
  readonly batchSize?: number; // Tasks to reduce per maintenance cycle (default 10)
}

export interface LogReductionBatchResult {
  readonly tasksEvaluated: number;
  readonly tasksReduced: number;
  readonly stagesReduced: number;
  readonly totalOriginalBytes: number;
  readonly totalReducedBytes: number;
  readonly totalReclaimedBytes: number;
  readonly reductionSummaries: readonly TaskStatisticalHistogram[];
}

export class LogReductionService {
  private readonly driver: IDatabaseDriver;
  private readonly maxStorageThresholdBytes: number;
  private readonly minTaskAgeDays: number;
  private readonly preserveRecentTasksCount: number;
  private readonly preserveLightweightStages: boolean;
  private readonly batchSize: number;

  constructor(config: LogReductionConfig) {
    this.driver = config.driver;
    this.maxStorageThresholdBytes = config.maxStorageThresholdBytes ?? 250 * 1024 * 1024;
    this.minTaskAgeDays = config.minTaskAgeDays ?? 3;
    this.preserveRecentTasksCount = config.preserveRecentTasksCount ?? 20;
    this.preserveLightweightStages = config.preserveLightweightStages ?? true;
    this.batchSize = config.batchSize ?? 10;
  }

  public getMaxStorageThresholdBytes(): number {
    return this.maxStorageThresholdBytes;
  }

  /**
   * Evaluates storage and reduces older eligible task logs down to statistical histograms.
   * Employs generous selection criteria to preserve recent operational context while
   * rotating verbose historical logs.
   *
   * @param options Optional overrides for batch execution
   */
  public async reduceEligibleTasks(options?: {
    readonly force?: boolean;
    readonly limit?: number;
    readonly minAgeDays?: number;
    readonly preserveRecent?: number;
  }): Promise<LogReductionBatchResult> {
    const limit = options?.limit ?? this.batchSize;
    const minAgeDays = options?.minAgeDays ?? this.minTaskAgeDays;
    const preserveRecent = options?.preserveRecent ?? this.preserveRecentTasksCount;
    const cutoffDate = new Date(Date.now() - minAgeDays * 24 * 60 * 60 * 1000).toISOString();

    // Query non-running tasks ordered by creation date (oldest first).
    // Exclude tasks already currently executing or the latest N tasks.
    const eligibleTasksQuery = `
      SELECT t.id, t.title, t.status, t.created_at
      FROM tasks t
      WHERE t.status != 'RUNNING'
        AND t.created_at < $1
        AND t.id NOT IN (
          SELECT id FROM tasks ORDER BY created_at DESC LIMIT $2
        )
      ORDER BY t.created_at ASC
      LIMIT $3
    `;

    const tasks = await this.driver.query<{
      readonly id: string;
      readonly title: string;
      readonly status: string;
      readonly created_at: string;
    }>(eligibleTasksQuery, [cutoffDate, preserveRecent, limit]);

    let totalStagesReduced = 0;
    let totalOriginalBytes = 0;
    let totalReducedBytes = 0;
    let totalReclaimedBytes = 0;
    const reductionSummaries: TaskStatisticalHistogram[] = [];

    for (const task of tasks) {
      const summary = await this.reduceTaskById(task.id, `Age threshold reduction (created ${task.created_at})`);
      if (summary && summary.stagesReduced > 0) {
        totalStagesReduced += summary.stagesReduced;
        totalOriginalBytes += summary.originalLogBytes;
        totalReducedBytes += summary.reducedLogBytes;
        totalReclaimedBytes += summary.reclaimedBytes;
        reductionSummaries.push(summary);
      }
    }

    return {
      tasksEvaluated: tasks.length,
      tasksReduced: reductionSummaries.length,
      stagesReduced: totalStagesReduced,
      totalOriginalBytes,
      totalReducedBytes,
      totalReclaimedBytes,
      reductionSummaries,
    };
  }

  /**
   * Reduces an individual task's stages down to statistical histograms and logs the reduction.
   *
   * @param taskId Unique identifier of the task
   * @param reason Reason documented in the reduction log
   */
  public async reduceTaskById(
    taskId: string,
    reason = "Manual on-demand profile reduction",
  ): Promise<TaskStatisticalHistogram | null> {
    const taskRows = await this.driver.query<{
      readonly id: string;
      readonly title: string;
      readonly status: string;
    }>("SELECT id, title, status FROM tasks WHERE id = $1", [taskId]);

    const task = taskRows[0];
    if (!task) return null;

    // Fetch all stages for this task
    const stages = await this.driver.query<{
      readonly id: number;
      readonly stage_name: string;
      readonly stage_status: string;
      readonly log_output: string | null;
      readonly tokens_sent: number;
      readonly tokens_received: number;
      readonly duration_ms: number;
      readonly started_at: string;
      readonly completed_at: string | null;
    }>("SELECT * FROM task_stages WHERE task_id = $1 ORDER BY id ASC", [taskId]);

    if (stages.length === 0) return null;

    const stageCounters: Record<string, number> = {};
    const durationBuckets: Record<"<1s" | "1-5s" | "5-15s" | "15-60s" | ">60s", number> = {
      "<1s": 0,
      "1-5s": 0,
      "5-15s": 0,
      "15-60s": 0,
      ">60s": 0,
    };
    const statusDistribution: Record<string, number> = {};
    const stageTypeDistribution: Record<string, number> = {};
    let totalSent = 0;
    let totalReceived = 0;
    let originalLogBytes = 0;
    let reducedLogBytes = 0;
    let stagesReduced = 0;
    const stageHistograms: StageHistogramMetrics[] = [];

    const reducedNoticePrefix = "The log of this has been reduced, this is it's histogram:";

    for (const st of stages) {
      stageCounters[st.stage_name] = (stageCounters[st.stage_name] || 0) + 1;
      const attemptNumber: number = stageCounters[st.stage_name] ?? 1;

      statusDistribution[st.stage_status] = (statusDistribution[st.stage_status] || 0) + 1;
      stageTypeDistribution[st.stage_name] = (stageTypeDistribution[st.stage_name] || 0) + 1;
      totalSent += Number(st.tokens_sent || 0);
      totalReceived += Number(st.tokens_received || 0);

      const dur = Number(st.duration_ms || 0);
      const bucket = this.computeDurationBucket(dur);
      durationBuckets[bucket] = (durationBuckets[bucket] || 0) + 1;

      const rawLog = st.log_output || "";
      const rawBytes = Buffer.byteLength(rawLog, "utf8");
      originalLogBytes += rawBytes;

      // Skip already reduced stages
      if (rawLog.startsWith(reducedNoticePrefix)) {
        reducedLogBytes += rawBytes;
        continue;
      }

      // Check whether this stage qualifies for reduction
      const isLightweight =
        this.preserveLightweightStages &&
        (st.stage_name === "deterministic_scrub" || st.stage_name === "planning");

      // Only reduce if raw log is non-trivial (> 256 bytes) and not a preserved lightweight stage
      if (!isLightweight && rawBytes > 256) {
        const lineCount = rawLog.split("\n").length;
        const reducedNotice = this.generateStageReducedNotice({
          stageName: st.stage_name,
          attemptNumber,
          stageStatus: st.stage_status,
          durationMs: dur,
          durationBucket: bucket,
          tokensSent: Number(st.tokens_sent || 0),
          tokensReceived: Number(st.tokens_received || 0),
          originalBytes: rawBytes,
          lineCount,
        });

        const newBytes = Buffer.byteLength(reducedNotice, "utf8");
        const reclaimedBytes = Math.max(0, rawBytes - newBytes);

        // Update stage in database
        await this.driver.execute(
          "UPDATE task_stages SET log_output = $1 WHERE id = $2",
          [reducedNotice, st.id],
        );

        stagesReduced++;
        reducedLogBytes += newBytes;

        stageHistograms.push({
          stageId: Number(st.id),
          stageName: st.stage_name,
          attemptNumber,
          stageStatus: st.stage_status,
          durationMs: dur,
          durationBucket: bucket,
          tokensSent: Number(st.tokens_sent || 0),
          tokensReceived: Number(st.tokens_received || 0),
          originalBytes: rawBytes,
          lineCount,
          reducedBytes: newBytes,
          reclaimedBytes,
        });
      } else {
        reducedLogBytes += rawBytes;
      }
    }

    const reclaimedBytes = Math.max(0, originalLogBytes - reducedLogBytes);
    const reclaimedPct =
      originalLogBytes > 0
        ? Number(((reclaimedBytes / originalLogBytes) * 100).toFixed(1))
        : 0;

    const histogram: TaskStatisticalHistogram = {
      taskId: task.id,
      taskTitle: task.title,
      totalStages: stages.length,
      stagesReduced,
      originalLogBytes,
      reducedLogBytes,
      reclaimedBytes,
      reclaimedPct,
      durationBuckets,
      statusDistribution,
      stageTypeDistribution,
      tokenSummary: {
        totalSent,
        totalReceived,
      },
      stageHistograms,
    };

    // If any stages were reduced, record an entry in reduction_logs
    if (stagesReduced > 0) {
      await this.recordReductionLogEntry({
        taskId: task.id,
        stagesReduced,
        originalBytes: originalLogBytes,
        reducedBytes: reducedLogBytes,
        reclaimedBytes,
        reductionReason: reason,
        histogramData: JSON.stringify(histogram),
      });
    }

    return histogram;
  }

  /**
   * Fetches recent reduction logs for auditing and UI ticket reconstruction.
   */
  public async getReductionLogs(limit = 50): Promise<readonly ReductionLogRecord[]> {
    const rows = await this.driver.query<{
      readonly id: number;
      readonly task_id: string;
      readonly reduced_at: string;
      readonly stages_reduced: number;
      readonly original_bytes: number;
      readonly reduced_bytes: number;
      readonly reclaimed_bytes: number;
      readonly reduction_reason: string;
      readonly histogram_data: string;
    }>(
      `SELECT id, task_id, reduced_at, stages_reduced, original_bytes, reduced_bytes,
              reclaimed_bytes, reduction_reason, histogram_data
       FROM reduction_logs
       ORDER BY id DESC
       LIMIT $1`,
      [limit],
    );

    return rows.map((r) => ({
      id: Number(r.id),
      taskId: r.task_id,
      reducedAt: String(r.reduced_at),
      stagesReduced: Number(r.stages_reduced),
      originalBytes: Number(r.original_bytes),
      reducedBytes: Number(r.reduced_bytes),
      reclaimedBytes: Number(r.reclaimed_bytes),
      reductionReason: r.reduction_reason,
      histogramData: r.histogram_data,
    }));
  }

  /**
   * Formats a stage reduced notice with the exact requested phrase and structured statistical metrics.
   */
  private generateStageReducedNotice(params: {
    readonly stageName: string;
    readonly attemptNumber: number;
    readonly stageStatus: string;
    readonly durationMs: number;
    readonly durationBucket: string;
    readonly tokensSent: number;
    readonly tokensReceived: number;
    readonly originalBytes: number;
    readonly lineCount: number;
  }): string {
    const attemptStr = params.attemptNumber > 1 ? ` (Attempt ${params.attemptNumber})` : "";
    const sizeKb = (params.originalBytes / 1024).toFixed(2);
    const durationSec = (params.durationMs / 1000).toFixed(2);

    return [
      "The log of this has been reduced, this is it's histogram:",
      `Stage: ${params.stageName}${attemptStr}`,
      `Status: ${params.stageStatus}`,
      `Duration: ${params.durationMs}ms (${durationSec}s, Bucket: ${params.durationBucket})`,
      `Tokens: ${params.tokensSent} sent, ${params.tokensReceived} received`,
      `Raw log size before reduction: ${params.originalBytes} bytes (${sizeKb} KB, ${params.lineCount} lines)`,
      `Stage weight ratio: ${STAGE_SIZE_RATIOS[params.stageName] ?? 1}x`,
      `Reduced timestamp: ${new Date().toISOString()}`,
    ].join("\n");
  }

  private computeDurationBucket(ms: number): "<1s" | "1-5s" | "5-15s" | "15-60s" | ">60s" {
    if (ms < 1000) return "<1s";
    if (ms < 5000) return "1-5s";
    if (ms < 15000) return "5-15s";
    if (ms < 60000) return "15-60s";
    return ">60s";
  }

  private async recordReductionLogEntry(params: {
    readonly taskId: string;
    readonly stagesReduced: number;
    readonly originalBytes: number;
    readonly reducedBytes: number;
    readonly reclaimedBytes: number;
    readonly reductionReason: string;
    readonly histogramData: string;
  }): Promise<void> {
    const reducedAt = new Date().toISOString();
    await this.driver.execute(
      `INSERT INTO reduction_logs (
        task_id, reduced_at, stages_reduced, original_bytes, reduced_bytes,
        reclaimed_bytes, reduction_reason, histogram_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.taskId,
        reducedAt,
        params.stagesReduced,
        params.originalBytes,
        params.reducedBytes,
        params.reclaimedBytes,
        params.reductionReason,
        params.histogramData,
      ],
    );
  }
}
