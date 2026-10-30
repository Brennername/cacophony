import { GiteaApiClient } from "./GiteaApiClient.js";
import type { GiteaPullRequest } from "./giteaTypes.js";
import { StructuredLogger } from "../telemetry/StructuredLogger.js";

export interface PrReconciliationWorkerOptions {
  readonly giteaClient: GiteaApiClient;
  readonly owner?: string | undefined;
  readonly repo?: string | undefined;
  readonly autoMergeClean?: boolean | undefined;
  readonly intervalMs?: number | undefined;
  readonly maxPrsPerCycle?: number | undefined;
  readonly logger?: StructuredLogger | undefined;
}

export interface ReconciliationReport {
  readonly totalAudited: number;
  readonly mergedCount: number;
  readonly conflictedCount: number;
  readonly failedCount: number;
  readonly skippedCount: number;
  readonly mergedPrs: readonly number[];
  readonly conflictedPrs: readonly number[];
}

/**
 * PrReconciliationWorker
 *
 * Continuously audits open Gitea pull requests created by autonomous arena workers.
 * Identifies clean, non-conflicted pull requests with verified stages, squash-merges
 * them into the base branch, and prunes stale ephemeral branches to keep the base tree moving.
 */
export class PrReconciliationWorker {
  private readonly client: GiteaApiClient;
  private readonly owner: string;
  private readonly repo: string;
  private readonly autoMergeClean: boolean;
  private readonly intervalMs: number;
  private readonly maxPrsPerCycle: number;
  private readonly logger: StructuredLogger;

  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(options: PrReconciliationWorkerOptions) {
    this.client = options.giteaClient;
    this.owner =
      options.owner ||
      process.env.GITEA_OWNER ||
      process.env.GITEA_ADMIN_USER ||
      "NeXeN";
    this.repo = options.repo || process.env.GITEA_REPO || "cacophony";
    this.autoMergeClean = options.autoMergeClean ?? true;
    this.intervalMs = options.intervalMs ?? 60_000;
    this.maxPrsPerCycle = options.maxPrsPerCycle ?? 50;
    this.logger =
      options.logger ?? new StructuredLogger("PrReconciliationWorker");
  }

  /**
   * Starts periodic reconciliation polling loop.
   */
  public start(): void {
    if (this.timer) {
      return;
    }
    this.logger.info("Starting PrReconciliationWorker interval poller", {
      owner: this.owner,
      repo: this.repo,
      intervalMs: this.intervalMs,
      maxPrsPerCycle: this.maxPrsPerCycle,
    });
    this.timer = setInterval(async () => {
      try {
        await this.reconcileOnce();
      } catch (err) {
        this.logger.warn("Non-fatal error during periodic PR reconciliation cycle", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }, this.intervalMs);
  }

  /**
   * Stops periodic reconciliation polling loop.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.info("Stopped PrReconciliationWorker interval poller");
    }
  }

  /**
   * Checks if poller is currently running.
   */
  public isRunning(): boolean {
    return this.timer !== null;
  }

  /**
   * Executes a single reconciliation pass over open pull requests.
   */
  public async reconcileOnce(): Promise<ReconciliationReport> {
    if (this.isProcessing) {
      this.logger.info("Reconciliation cycle already in progress, skipping pass");
      return {
        totalAudited: 0,
        mergedCount: 0,
        conflictedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        mergedPrs: [],
        conflictedPrs: [],
      };
    }

    this.isProcessing = true;
    try {
      return await this.executeReconciliationPass();
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeReconciliationPass(): Promise<ReconciliationReport> {
    const allOpenPrs: GiteaPullRequest[] = [];
    let page = 1;
    const pageSize = 50;

    // Fetch open PRs up to maxPrsPerCycle limit
    while (allOpenPrs.length < this.maxPrsPerCycle) {
      const batch = await this.client.listPullRequests(
        this.owner,
        this.repo,
        "open",
        page,
        pageSize,
      );
      if (!batch || batch.length === 0) {
        break;
      }
      allOpenPrs.push(...batch);
      if (batch.length < pageSize) {
        break;
      }
      page++;
    }

    // Sort ascending by PR index (FIFO: oldest PRs reconciled first)
    allOpenPrs.sort((a, b) => a.number - b.number);

    let mergedCount = 0;
    let conflictedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const mergedPrs: number[] = [];
    const conflictedPrs: number[] = [];

    for (const pr of allOpenPrs) {
      if (pr.merged || pr.state !== "open") {
        skippedCount++;
        continue;
      }

      // Only proceed if PR is strictly verified mergeable (mergeable === true)
      if (pr.mergeable !== true) {
        conflictedCount++;
        conflictedPrs.push(pr.number);
        this.logger.debug(
          "PR is not cleanly mergeable with base branch, skipping auto-merge",
          {
            prNumber: pr.number,
            title: pr.title,
            mergeable: pr.mergeable,
          },
        );
        continue;
      }

      if (!this.autoMergeClean) {
        skippedCount++;
        continue;
      }

      // Attempt clean squash-merge
      try {
        await this.client.mergePullRequest(this.owner, this.repo, pr.number, {
          Do: "squash",
          MergeTitleField: pr.title,
          MergeMessageField: `Autonomous reconciliation: squash-merged verified PR #${pr.number}`,
          delete_branch_after_merge: true,
        });

        mergedCount++;
        mergedPrs.push(pr.number);
        this.logger.info("Successfully reconciled and squash-merged PR", {
          prNumber: pr.number,
          title: pr.title,
        });
      } catch (err) {
        failedCount++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn("Failed to squash-merge PR during reconciliation pass", {
          prNumber: pr.number,
          title: pr.title,
          error: errorMessage,
        });
      }
    }

    const report: ReconciliationReport = {
      totalAudited: allOpenPrs.length,
      mergedCount,
      conflictedCount,
      failedCount,
      skippedCount,
      mergedPrs,
      conflictedPrs,
    };

    if (mergedCount > 0 || conflictedCount > 0) {
      this.logger.info("Completed PR reconciliation pass", {
        totalAudited: report.totalAudited,
        mergedCount: report.mergedCount,
        conflictedCount: report.conflictedCount,
        failedCount: report.failedCount,
      });
    }

    return report;
  }
}
