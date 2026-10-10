import * as crypto from "node:crypto";
import type { TaskRepository } from "@cacophony/db";
import type { GiteaApiClient } from "./GiteaApiClient.js";

export interface GiteaWebhookPayload {
  readonly action?: string | undefined;
  readonly repository?: {
    readonly name: string;
    readonly full_name: string;
    readonly clone_url: string;
    readonly default_branch: string;
    readonly owner?: { readonly login: string; readonly username?: string } | undefined;
  } | undefined;
  readonly issue?: {
    readonly number: number;
    readonly title: string;
    readonly body: string;
    readonly labels?: Array<{ name: string }> | undefined;
  } | undefined;
  readonly comment?: {
    readonly id: number;
    readonly body: string;
    readonly user?: {
      readonly login: string;
    } | undefined;
  } | undefined;
  readonly pull_request?: {
    readonly number: number;
    readonly title: string;
    readonly body: string;
    readonly head: {
      readonly ref: string;
    };
    readonly base?: {
      readonly ref: string;
    } | undefined;
  } | undefined;
  readonly review?: {
    readonly id: number;
    readonly state: string; // "APPROVED", "REQUEST_CHANGES", "COMMENT"
    readonly body?: string | undefined;
    readonly user?: { readonly login: string } | undefined;
  } | undefined;
}

export interface WebhookProcessingResult {
  readonly processed: boolean;
  readonly taskId?: string | undefined;
  readonly actionTriggered?: string | undefined;
  readonly reason?: string | undefined;
}

/**
 * Webhook dispatcher handling pull_request, pull_request_review, issue, and comment webhooks.
 *
 * Implements:
 * - HMAC-SHA256 signature verification.
 * - Enqueuing remediation tasks when PR review requests changes.
 * - Triggering automated squash-and-merge via GiteaApiClient and completing tasks when PR review is APPROVED.
 */
export class GiteaWebhookReceiver {
  private readonly taskRepo: TaskRepository;
  private readonly secretKey: string | undefined;
  private readonly giteaClient: GiteaApiClient | undefined;

  constructor(
    taskRepo: TaskRepository,
    secretKey?: string,
    giteaClient?: GiteaApiClient
  ) {
    this.taskRepo = taskRepo;
    this.secretKey = secretKey;
    this.giteaClient = giteaClient;
  }

  /**
   * Validates Gitea HMAC-SHA256 signature if secretKey is configured.
   */
  public verifySignature(payloadBody: string, signatureHeader?: string): boolean {
    if (!this.secretKey) {
      return true;
    }
    if (!signatureHeader) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.secretKey)
      .update(payloadBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature.toLowerCase());
    const signatureBuf = Buffer.from(signatureHeader.toLowerCase());

    if (expectedBuf.byteLength !== signatureBuf.byteLength) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuf, expectedBuf);
  }

  /**
   * Processes webhook event and enqueues a new task or dispatches remediation/merge.
   */
  public async handleWebhook(
    event: string,
    payload: GiteaWebhookPayload
  ): Promise<WebhookProcessingResult> {
    // 1. Issues opened or reopened
    if (event === "issues" && (payload.action === "opened" || payload.action === "reopened")) {
      if (!payload.issue || !payload.repository) {
        return { processed: false, reason: "Missing issue or repository in payload." };
      }

      const taskId = `gitea-issue-${payload.issue.number}-${Date.now()}`;
      await this.taskRepo.create({
        id: taskId,
        title: `[Gitea Issue #${payload.issue.number}] ${payload.issue.title}`,
        prompt: `[Gitea Issue #${payload.issue.number}] ${payload.issue.title}\n\n${payload.issue.body || ""}`,
        role: "implementer",
        status: "PENDING",
        priority: payload.issue.title.toLowerCase().includes("[urgent]") ? "P0" : "P1",
        modelAssigned: null,
        testCommand: null,
        focusFiles: null,
        targetBranch: payload.repository.default_branch || "main",
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      });

      return {
        processed: true,
        taskId,
        actionTriggered: "issue_enqueued"
      };
    }

    // 2. Issue comments with /cacophony commands
    if (event === "issue_comment" && payload.action === "created") {
      if (!payload.comment || !payload.issue || !payload.repository) {
        return { processed: false, reason: "Missing comment, issue, or repository in payload." };
      }

      const commentBody = payload.comment.body.trim();
      if (commentBody.startsWith("/cacophony run") || commentBody.startsWith("/cacophony retry")) {
        const taskId = `gitea-comment-cmd-${payload.issue.number}-${Date.now()}`;
        await this.taskRepo.create({
          id: taskId,
          title: `[Triggered via Comment] Issue #${payload.issue.number}: ${payload.issue.title}`,
          prompt: `User command in comment: ${commentBody}\n\nContext Issue #${payload.issue.number}:\n${payload.issue.title}\n${payload.issue.body || ""}`,
          role: "implementer",
          status: "PENDING",
          priority: "P0",
          modelAssigned: null,
          testCommand: null,
          focusFiles: null,
          targetBranch: payload.repository.default_branch || "main",
          prUrl: null,
          failureCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null
        });

        return {
          processed: true,
          taskId,
          actionTriggered: "command_task_enqueued"
        };
      }

      return {
        processed: false,
        reason: "Comment does not contain actionable /cacophony directive."
      };
    }

    // 3. Pull Request events
    if (event === "pull_request" && (payload.action === "opened" || payload.action === "synchronized")) {
      if (!payload.pull_request) {
        return { processed: false, reason: "Missing pull_request object in payload." };
      }

      const taskId = `gitea-pr-review-${payload.pull_request.number}-${Date.now()}`;
      await this.taskRepo.create({
        id: taskId,
        title: `Review Gitea PR #${payload.pull_request.number}: ${payload.pull_request.title}`,
        prompt: `Review Gitea PR #${payload.pull_request.number}: ${payload.pull_request.title}\n\nBranch: ${payload.pull_request.head.ref}`,
        role: "reviewer",
        status: "PENDING",
        priority: "P0",
        modelAssigned: null,
        testCommand: null,
        focusFiles: null,
        targetBranch: payload.pull_request.head.ref,
        prUrl: null,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      });

      return {
        processed: true,
        taskId,
        actionTriggered: "pr_review_enqueued"
      };
    }

    // 4. Pull Request Review events (e.g. submitted, reviewed)
    if (
      event === "pull_request_review" ||
      (event === "pull_request" && (payload.action === "submitted" || payload.action === "reviewed"))
    ) {
      const pr = payload.pull_request;
      const review = payload.review;
      const repo = payload.repository;

      if (!pr) {
        return { processed: false, reason: "Missing pull_request in review payload." };
      }

      const state = (review?.state || payload.action || "").toUpperCase();

      // 4a. When PR review is APPROVED: trigger squash-and-merge and complete task
      if (state === "APPROVED") {
        if (this.giteaClient && repo) {
          const owner = repo.owner?.login || repo.owner?.username || repo.full_name?.split("/")[0] || "owner";
          try {
            await this.giteaClient.mergePullRequest(owner, repo.name, pr.number, {
              Do: "squash",
              MergeTitleField: `Merge PR #${pr.number}: ${pr.title}`
            });
          } catch (mergeErr) {
            console.error("[GiteaWebhookReceiver] Squash-merge failed for PR:", pr.number, mergeErr);
          }
        }

        // Locate any corresponding active tasks for this PR branch and mark COMPLETED
        const pendingTasks = await this.taskRepo.listPending();
        const matchingTask = pendingTasks.find(
          (t) => t.targetBranch === pr.head.ref || (t.prUrl && t.prUrl.includes(`/pulls/${pr.number}`))
        );

        if (matchingTask) {
          await this.taskRepo.updateStatus(matchingTask.id, "COMPLETED");
        }

        return {
          processed: true,
          actionTriggered: "pr_approved_merged"
        };
      }

      // 4b. When PR review request changes is received: dispatch remediation task targeting PR branch
      if (state === "REQUEST_CHANGES" || state === "REQUESTED_CHANGES" || state === "CHANGES_REQUESTED") {
        const remediationTaskId = `remedy-pr-${pr.number}-${Date.now().toString(36)}`;
        const reviewerName = review?.user?.login || "reviewer";
        const reviewNotes = review?.body || "Changes requested during code review.";

        await this.taskRepo.create({
          id: remediationTaskId,
          title: `[Remediation] PR #${pr.number}: ${pr.title}`,
          prompt: `Remediation required for Pull Request #${pr.number}: ${pr.title}\n\nReviewer (@${reviewerName}) Feedback:\n${reviewNotes}\n\nTarget branch: ${pr.head.ref}`,
          role: "implementer",
          status: "PENDING",
          priority: "P0",
          modelAssigned: null,
          testCommand: null,
          focusFiles: null,
          targetBranch: pr.head.ref,
          prUrl: null,
          failureCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null
        });

        // If existing task was RUNNING, update to REMEDIATING
        const pendingTasks = await this.taskRepo.listPending();
        const parentTask = pendingTasks.find((t) => t.targetBranch === pr.head.ref);
        if (parentTask) {
          await this.taskRepo.updateStatus(parentTask.id, "REMEDIATING");
        }

        return {
          processed: true,
          taskId: remediationTaskId,
          actionTriggered: "remediation_task_enqueued"
        };
      }
    }

    return {
      processed: false,
      reason: `Unhandled event type "${event}" or action "${payload.action}".`
    };
  }
}
