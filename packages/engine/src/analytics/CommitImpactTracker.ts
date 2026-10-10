import type { TaskRepository, StageRepository } from "@cacophony/db";
import type {
  TaskRecord,
  ICommitImpactReport,
  CommitImpactVerdict
} from "@cacophony/shared-types";
import { GitRegressionCorrelator } from "./GitRegressionCorrelator.js";

export interface ICommitImpactTrackerOptions {
  readonly taskRepo: TaskRepository;
  readonly stageRepo?: StageRepository | undefined;
  readonly correlator?: GitRegressionCorrelator | undefined;
}

/**
 * CommitImpactTracker
 *
 * Implements granular commit-to-task attribution. Traces git commits directly
 * to task completion, failure rates, and token efficiency. Differentiates between
 * genuine system degradation versus productive stricter guardrail rejections
 * (which can be rehabilitated), and flags noisy commits that burn local tokens
 * without delivering organic improvements.
 */
export class CommitImpactTracker {
  private readonly taskRepo: TaskRepository;
  private readonly stageRepo?: StageRepository | undefined;
  private readonly correlator: GitRegressionCorrelator;

  constructor(options: ICommitImpactTrackerOptions) {
    this.taskRepo = options.taskRepo;
    this.stageRepo = options.stageRepo;
    this.correlator = options.correlator ?? new GitRegressionCorrelator();
  }

  /**
   * Generates a comprehensive impact report for a single git commit hash.
   */
  public async evaluateCommitImpact(
    commitHash: string,
    priorBaselinePassRate = 60.0
  ): Promise<ICommitImpactReport> {
    const recentCommits = this.correlator.getRecentCommits(30);
    const commitMeta = recentCommits.find((c) => c.hash.startsWith(commitHash) || commitHash.startsWith(c.hash)) ?? {
      hash: commitHash,
      author: "Autonomous System",
      timestamp: Date.now(),
      subject: `Commit ${commitHash.slice(0, 8)}`
    };

    const filesChanged = commitMeta.filesChanged ?? this.correlator.getCommitFiles(commitHash);

    // 1. Fetch tasks directly attributed via commit_hash or base_commit_hash
    const directTasks = await this.taskRepo.listByCommitHash(commitHash);

    // 2. Fetch tasks executed around the commit that touched overlapping files
    const recentTasks = await this.taskRepo.listRecent(100);
    const overlappingTasks = recentTasks.filter((task) => {
      if (directTasks.some((dt) => dt.id === task.id)) return false;
      const taskTime = new Date(task.completedAt ?? task.updatedAt).getTime();
      if (taskTime < commitMeta.timestamp - 300_000) return false; // occurred well before commit

      const taskFocus = task.focusFiles
        ? task.focusFiles.split(",").map((f) => f.trim())
        : [];
      return taskFocus.some((tf) =>
        filesChanged.some((cf) => cf.includes(tf) || tf.includes(cf))
      );
    });

    const relevantTasks: TaskRecord[] = [...directTasks, ...overlappingTasks];

    // Compute task counts and pass rates
    const terminalTasks = relevantTasks.filter(
      (t) => t.status === "COMPLETED" || t.status === "FAILED"
    );
    const tasksAttempted = terminalTasks.length;
    const tasksPassed = terminalTasks.filter((t) => t.status === "COMPLETED").length;
    const tasksFailed = terminalTasks.filter((t) => t.status === "FAILED").length;
    const passRatePercent =
      tasksAttempted > 0 ? Number(((tasksPassed / tasksAttempted) * 100).toFixed(1)) : 100.0;
    const deltaVsPriorCommit = Number((passRatePercent - priorBaselinePassRate).toFixed(1));

    // Token accounting
    let totalTokensConsumed = 0;
    for (const task of terminalTasks) {
      if (this.stageRepo) {
        try {
          const stages = await this.stageRepo.getStagesForTask(task.id);
          const tokens = stages.reduce(
            (sum, s) => sum + s.tokensSent + s.tokensReceived,
            0
          );
          totalTokensConsumed += tokens;
        } catch {
          // fallback to estimated tokens
          totalTokensConsumed += (task.durationMs ?? 10_000) * 0.05;
        }
      } else {
        totalTokensConsumed += (task.durationMs ?? 10_000) * 0.05;
      }
    }
    totalTokensConsumed = Math.round(totalTokensConsumed);

    const tokenEfficiency =
      tasksPassed > 0
        ? Math.round(totalTokensConsumed / tasksPassed)
        : totalTokensConsumed;

    // Determine verdict
    const { verdict, rationale } = this.determineVerdict(
      tasksAttempted,
      tasksPassed,
      tasksFailed,
      passRatePercent,
      deltaVsPriorCommit,
      totalTokensConsumed,
      terminalTasks
    );

    return {
      commitHash: commitMeta.hash,
      author: commitMeta.author,
      timestamp: commitMeta.timestamp,
      subject: commitMeta.subject,
      filesChanged,
      tasksAttempted,
      tasksPassed,
      tasksFailed,
      passRatePercent,
      deltaVsPriorCommit,
      totalTokensConsumed,
      tokenEfficiency,
      verdict,
      rationale
    };
  }

  /**
   * Generates impact reports across recent git commits.
   */
  public async generateRecentImpactReport(limit = 15): Promise<readonly ICommitImpactReport[]> {
    const commits = this.correlator.getRecentCommits(limit);
    const reports: ICommitImpactReport[] = [];

    for (const commit of commits) {
      const report = await this.evaluateCommitImpact(commit.hash);
      reports.push(report);
    }

    return reports;
  }

  /**
   * Filters commits that burned tokens without producing passed tasks or guardrails.
   */
  public async identifyNoisyCommits(
    tokenThreshold = 25_000
  ): Promise<readonly ICommitImpactReport[]> {
    const allReports = await this.generateRecentImpactReport(20);
    return allReports.filter(
      (r) =>
        r.verdict === "NOISY_WASTE" ||
        (r.tasksPassed === 0 && r.totalTokensConsumed > tokenThreshold)
    );
  }

  /**
   * Identifies commits that caused genuine test/build regressions.
   */
  public async identifyRegressions(): Promise<readonly ICommitImpactReport[]> {
    const allReports = await this.generateRecentImpactReport(20);
    return allReports.filter((r) => r.verdict === "DEGRADATION");
  }

  /**
   * Evaluates task outcomes and log snippets to categorize impact cleanly.
   */
  private determineVerdict(
    tasksAttempted: number,
    tasksPassed: number,
    tasksFailed: number,
    passRatePercent: number,
    deltaVsPriorCommit: number,
    totalTokensConsumed: number,
    tasks: readonly TaskRecord[]
  ): { verdict: CommitImpactVerdict; rationale: string } {
    if (tasksAttempted === 0) {
      return {
        verdict: "NEUTRAL",
        rationale: "No executed tasks mapped to this commit."
      };
    }

    // Inspect if failures are due to productive stricter guardrails (anti-stub, build gates)
    const guardrailFailures = tasks.filter((t) => {
      const text = `${t.failureReason ?? ""} ${t.logSnippet ?? ""}`.toLowerCase();
      return (
        text.includes("anti-stub") ||
        text.includes("placeholder") ||
        text.includes("monorepobuildgate") ||
        text.includes("pre-pr verification") ||
        text.includes("unimplemented") ||
        text.includes("banned import") ||
        text.includes("type error")
      );
    });

    if (tasksFailed > 0 && guardrailFailures.length === tasksFailed) {
      return {
        verdict: "STRICTER_GUARDRAIL",
        rationale:
          "Commit instituted stricter engineering integrity or build gates. Rejections reflect higher standards and are candidate for deterministic rehabilitation."
      };
    }

    if (tasksPassed > 0 && passRatePercent >= 75.0 && deltaVsPriorCommit >= 0) {
      return {
        verdict: "IMPROVEMENT",
        rationale: `Organic improvement in subsystem pass rate (${passRatePercent}% pass rate, +${deltaVsPriorCommit}% delta).`
      };
    }

    if (tasksPassed === 0 && totalTokensConsumed > 20_000) {
      return {
        verdict: "NOISY_WASTE",
        rationale: `Consumed ${totalTokensConsumed} local tokens across ${tasksAttempted} attempts with 0 passes and no new guardrail assertions.`
      };
    }

    if (tasksFailed > tasksPassed && deltaVsPriorCommit < -15.0) {
      return {
        verdict: "DEGRADATION",
        rationale: `Regression identified: pass rate dropped by ${Math.abs(deltaVsPriorCommit)}% following this commit.`
      };
    }

    return {
      verdict: "NEUTRAL",
      rationale: `Subsystem execution remained stable (${passRatePercent}% pass rate).`
    };
  }
}
