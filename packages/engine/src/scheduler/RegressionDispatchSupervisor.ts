import type {
  IRollingWindowMetrics,
  TaskRecord,
} from "@cacophony/shared-types";
import { GitRegressionCorrelator, type CommitCorrelationResult } from "../analytics/GitRegressionCorrelator.js";

export interface ISupervisorTaskRepository {
  create(task: TaskRecord): Promise<TaskRecord>;
  listRecent(limit?: number): Promise<readonly TaskRecord[]>;
}

export interface HealthEvaluation {
  readonly isTriggered: boolean;
  readonly consecutiveFailures: number;
  readonly windowSuccessPercent: number;
  readonly correlation: CommitCorrelationResult | null;
  readonly diagnosticTaskCreated: TaskRecord | null;
}

export interface SupervisorOptions {
  readonly successThresholdPercent?: number;
  readonly consecutiveFailuresTrigger?: number;
  readonly frontierModel?: string;
}

/**
 * RegressionDispatchSupervisor
 *
 * Monitors windowed task execution trends and consecutive failure runs.
 * When health drops below threshold or performance plateaus, it autonomously
 * dispatches high-priority diagnostic remediation and intervention tasks.
 */
export class RegressionDispatchSupervisor {
  private readonly taskRepo: ISupervisorTaskRepository;
  private readonly correlator: GitRegressionCorrelator;
  private readonly successThreshold: number;
  private readonly consecutiveTrigger: number;
  private readonly frontierModel: string;

  constructor(
    taskRepo: ISupervisorTaskRepository,
    correlator?: GitRegressionCorrelator,
    options?: SupervisorOptions
  ) {
    this.taskRepo = taskRepo;
    this.correlator = correlator ?? new GitRegressionCorrelator();
    this.successThreshold = options?.successThresholdPercent ?? 60.0;
    this.consecutiveTrigger = options?.consecutiveFailuresTrigger ?? 3;
    this.frontierModel = options?.frontierModel ?? "qwen2.5-coder:7b-instruct-q4_K_M";
  }

  /**
   * Evaluates recent task stream health, pinpointing commit regressions when failure surges occur.
   */
  public async evaluateQueueHealth(recentTasks: readonly TaskRecord[]): Promise<HealthEvaluation> {
    const terminal = recentTasks.filter((t) => t.status === "COMPLETED" || t.status === "FAILED");
    if (terminal.length === 0) {
      return {
        isTriggered: false,
        consecutiveFailures: 0,
        windowSuccessPercent: 100,
        correlation: null,
        diagnosticTaskCreated: null,
      };
    }

    // Measure current consecutive failure run from newest
    let consecutiveFailures = 0;
    for (const t of terminal) {
      if (t.status === "FAILED") {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    const sample = terminal.slice(0, 10);
    const successCount = sample.filter((t) => t.status === "COMPLETED").length;
    const windowSuccessPercent = Number(((successCount / sample.length) * 100).toFixed(1));

    const isTriggered =
      consecutiveFailures >= this.consecutiveTrigger ||
      (sample.length >= 5 && windowSuccessPercent < this.successThreshold);

    if (!isTriggered) {
      return {
        isTriggered: false,
        consecutiveFailures,
        windowSuccessPercent,
        correlation: null,
        diagnosticTaskCreated: null,
      };
    }

    const latestFailed = terminal.find((t) => t.status === "FAILED");
    const correlation = latestFailed ? this.correlator.correlateFailure(latestFailed) : null;

    const diagnosticTaskCreated = await this.enqueueDiagnosticTask(latestFailed, correlation);

    return {
      isTriggered: true,
      consecutiveFailures,
      windowSuccessPercent,
      correlation,
      diagnosticTaskCreated,
    };
  }

  /**
   * Dispatches high-priority remediation diagnostic task targeting suspected regression.
   */
  public async enqueueDiagnosticTask(
    failedTask?: TaskRecord,
    correlation?: CommitCorrelationResult | null
  ): Promise<TaskRecord> {
    const timestamp = new Date().toISOString();
    const taskId = `remediation-diag-${Date.now()}`;
    const commitHash = correlation?.culpritCommit?.hash ? correlation.culpritCommit.hash.slice(0, 8) : "HEAD";

    const prompt = [
      `[REGRESSION MITIGATION TASK]`,
      `Failure surge detected. Target culprit commit: ${commitHash}.`,
      `Original failed task: ${failedTask?.title ?? "Unknown"}.`,
      `Rationale: ${correlation?.rationale ?? "Consecutive execution failure streak"}.`,
      `Synthesize targeted test assertions and apply surgical bug fix to restore test pass invariants.`,
    ].join("\n");

    const diagnosticRecord: TaskRecord = {
      id: taskId,
      title: `[P0 Triage] Regression Diagnostic for commit ${commitHash}`,
      prompt,
      role: "architect",
      status: "PENDING",
      priority: "P0",
      modelAssigned: this.frontierModel,
      testCommand: failedTask?.testCommand ?? "npm test",
      focusFiles: correlation?.matchedFiles.join(",") || failedTask?.focusFiles || "",
      targetBranch: null,
      prUrl: null,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      failureCount: 0,
    };

    return await this.taskRepo.create(diagnosticRecord);
  }

  /**
   * Enqueues smart model intervention when execution performance plateaus.
   */
  public async triggerPlateauIntervention(metrics: IRollingWindowMetrics): Promise<TaskRecord | null> {
    if (!metrics.isPlateaued) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const taskId = `plateau-intervention-${Date.now()}`;

    const prompt = [
      `[PLATEAU INTERVENTION TASK]`,
      `Arena success rate has stagnated at ${metrics.successRatePercent}% over window of ${metrics.windowSize} tasks.`,
      `Review recent failure logs, propose new deterministic rule definitions, edge-case guards, or hyperparameter adjustments.`,
    ].join("\n");

    const interventionTask: TaskRecord = {
      id: taskId,
      title: `[P0 Architecture] Plateau Intervention & Rule Tuning (${metrics.successRatePercent}%)`,
      prompt,
      role: "architect",
      status: "PENDING",
      priority: "P0",
      modelAssigned: this.frontierModel,
      testCommand: null,
      focusFiles: null,
      targetBranch: null,
      prUrl: null,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      failureCount: 0,
    };

    return await this.taskRepo.create(interventionTask);
  }
}
