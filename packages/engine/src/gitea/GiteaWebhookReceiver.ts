import * as crypto from "node:crypto";
import type { TaskRepository } from "@cacophony/db";

export interface GiteaWebhookPayload {
  readonly action?: string;
  readonly repository?: {
    readonly name: string;
    readonly full_name: string;
    readonly clone_url: string;
    readonly default_branch: string;
  };
  readonly issue?: {
    readonly number: number;
    readonly title: string;
    readonly body: string;
    readonly labels?: Array<{ name: string }>;
  };
  readonly comment?: {
    readonly id: number;
    readonly body: string;
    readonly user?: {
      readonly login: string;
    };
  };
  readonly pull_request?: {
    readonly number: number;
    readonly title: string;
    readonly body: string;
    readonly head: {
      readonly ref: string;
    };
  };
}

export interface WebhookProcessingResult {
  readonly processed: boolean;
  readonly taskId?: string;
  readonly actionTriggered?: string;
  readonly reason?: string;
}

/**
 * Webhook receiver processing Gitea issue, comment, and PR events,
 * transforming them asynchronously into Cacophony arena tasks.
 */
export class GiteaWebhookReceiver {
  private readonly taskRepo: TaskRepository;
  private readonly secretKey: string | undefined;

  constructor(taskRepo: TaskRepository, secretKey?: string) {
    this.taskRepo = taskRepo;
    this.secretKey = secretKey;
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
   * Processes webhook event and enqueues a new task if applicable.
   */
  public async handleWebhook(
    event: string,
    payload: GiteaWebhookPayload
  ): Promise<WebhookProcessingResult> {
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

    return {
      processed: false,
      reason: `Unhandled event type "${event}" or action "${payload.action}".`
    };
  }
}
