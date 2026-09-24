import type { TaskRepository, StageRepository } from "@cacophony/db";
import type { TaskRecord, ReviewVerdict, ReviewComment } from "@cacophony/shared-types";
import type { GiteaApiClient } from "./GiteaApiClient.js";
import type { AutomatedPrWorkflow } from "./AutomatedPrWorkflow.js";
import type { AutomatedPrReviewLoop } from "./AutomatedPrReviewLoop.js";
import type { WorktreeDescriptor } from "./GitWorktreeManager.js";

export interface ClosedLoopPrCycleOptions {
  readonly owner: string;
  readonly repo: string;
  readonly task: TaskRecord;
  readonly worktree: WorktreeDescriptor;
  readonly testSummary: string;
  readonly commitMessage: string;
  readonly reviewerModel: string;
  readonly autoMergeOnApproval?: boolean;
}

export interface ClosedLoopPrCycleResult {
  readonly success: boolean;
  readonly prNumber?: number | undefined;
  readonly verdict: ReviewVerdict;
  readonly merged: boolean;
  readonly remediationEnqueued: boolean;
  readonly remediationTaskId?: string | undefined;
  readonly comments: readonly ReviewComment[];
}

/**
 * ClosedLoopPrCoordinator
 *
 * Coordinates the full end-to-end pull request verification lifecycle:
 * 1. Pushes task branch and opens PR via AutomatedPrWorkflow.
 * 2. Triggers automated code review via AutomatedPrReviewLoop.
 * 3. If APPROVED: triggers automated squash merge and marks task stages completed.
 * 4. If REQUEST_CHANGES: synthesizes a targeted P0 remediation task into the TaskRepository
 *    with line-level review feedback so the scheduler continues remediation.
 */
export class ClosedLoopPrCoordinator {
  private readonly giteaClient: GiteaApiClient;
  private readonly prWorkflow: AutomatedPrWorkflow;
  private readonly reviewLoop: AutomatedPrReviewLoop;
  private readonly taskRepo: TaskRepository;
  private readonly stageRepo: StageRepository | undefined;

  constructor(options: {
    readonly giteaClient: GiteaApiClient;
    readonly prWorkflow: AutomatedPrWorkflow;
    readonly reviewLoop: AutomatedPrReviewLoop;
    readonly taskRepo: TaskRepository;
    readonly stageRepo?: StageRepository | undefined;
  }) {
    this.giteaClient = options.giteaClient;
    this.prWorkflow = options.prWorkflow;
    this.reviewLoop = options.reviewLoop;
    this.taskRepo = options.taskRepo;
    this.stageRepo = options.stageRepo;
  }

  public getStageRepository(): StageRepository | undefined {
    return this.stageRepo;
  }


  /**
   * Executes the automated PR publication, evaluation, and remediation loop.
   */
  public async executeCycle(options: ClosedLoopPrCycleOptions): Promise<ClosedLoopPrCycleResult> {
    // 1. Publish Pull Request
    const pubResult = await this.prWorkflow.publishPullRequest(options.worktree, {
      owner: options.owner,
      repo: options.repo,
      taskId: options.task.id,
      title: `[Autonomous PR] ${options.task.title}`,
      testSummary: options.testSummary,
      commitMessage: options.commitMessage
    });

    if (!pubResult.success || !pubResult.pullRequest) {
      return {
        success: false,
        verdict: "REJECT",
        merged: false,
        remediationEnqueued: false,
        comments: []
      };
    }

    const prNumber = pubResult.pullRequest.number;

    // 2. Evaluate PR with automated reviewer model
    const reviewResult = await this.reviewLoop.evaluatePullRequest({
      owner: options.owner,
      repo: options.repo,
      prNumber,
      taskId: options.task.id,
      reviewerModel: options.reviewerModel,
      autoMergeOnApproval: options.autoMergeOnApproval ?? true
    });

    // 3. Handle verdict
    if (reviewResult.verdict === "APPROVE") {
      // Auto merge PR if not already merged
      let isMerged = reviewResult.merged;
      if (!isMerged) {
        try {
          await this.giteaClient.mergePullRequest(options.owner, options.repo, prNumber, {
            Do: "squash",
            MergeTitleField: `Merge PR #${prNumber}: ${options.task.title}`
          });
          isMerged = true;
        } catch {
          isMerged = false;
        }
      }

      await this.taskRepo.updateStatus(options.task.id, "COMPLETED");

      return {
        success: true,
        prNumber,
        verdict: "APPROVE",
        merged: isMerged,
        remediationEnqueued: false,
        comments: reviewResult.record.comments
      };
    }

    // 4. Handle remediation request (REQUEST_CHANGES or REJECT)
    let remediationTaskId: string | undefined;
    if (reviewResult.remediationRequired || reviewResult.verdict === "REQUEST_CHANGES") {
      remediationTaskId = `remedy-${options.task.id}-${Date.now().toString(36)}`;
      const commentsFormatted = reviewResult.record.comments
        .map((c) => `- ${c.path}:${c.lineNumber ?? 0} [${c.severity}]: ${c.comment}`)
        .join("\n");

      const remediationPrompt = [
        `Remediation required for Task: ${options.task.title}`,
        `Pull Request: #${prNumber}`,
        "",
        "Reviewer Architect Feedback:",
        reviewResult.record.reviewNotes,
        "",
        "Flagged Comments:",
        commentsFormatted || "(General architectural review feedback)",
        "",
        "Original Prompt:",
        options.task.prompt
      ].join("\n");

      await this.taskRepo.create({
        id: remediationTaskId,
        title: `[Remediation] PR #${prNumber}: ${options.task.title}`,
        prompt: remediationPrompt,
        role: "implementer",
        status: "PENDING",
        priority: "P0",
        modelAssigned: options.task.modelAssigned,
        testCommand: options.task.testCommand,
        focusFiles: options.task.focusFiles,
        targetBranch: options.worktree.branchName,
        prUrl: pubResult.pullRequest.html_url,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      });

      await this.taskRepo.updateStatus(options.task.id, "REMEDIATING");
    }

    return {
      success: false,
      prNumber,
      verdict: reviewResult.verdict,
      merged: false,
      remediationEnqueued: Boolean(remediationTaskId),
      remediationTaskId,
      comments: reviewResult.record.comments
    };
  }
}
