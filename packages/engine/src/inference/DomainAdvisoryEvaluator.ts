import type {
  AdvisoryDomainTag,
  PrDiscussionComment,
} from "@cacophony/shared-types";
import type { PrDiscussionRepository } from "@cacophony/db";
import type { IGitPlatformProvider } from "../gitea/IGitPlatformProvider.js";
import type { IInferenceProvider } from "./IInferenceProvider.js";

export interface DomainAdvisoryEvaluationContext {
  readonly taskId: string;
  readonly prIndex: number;
  readonly taskTitle: string;
  readonly prompt?: string | undefined;
  readonly diff: string;
  readonly focusFiles?: string | null | undefined;
  readonly targetBranch?: string | null | undefined;
}

export interface DomainAdvisoryTip {
  readonly domain: AdvisoryDomainTag;
  readonly authorName: string;
  readonly authorRole: string;
  readonly title: string;
  readonly recommendation: string;
  readonly severity: "info" | "warning" | "blocker";
  readonly filePath?: string | undefined;
  readonly lineNumber?: number | undefined;
}

export interface DomainAdvisoryEvaluatorOptions {
  readonly discussionRepo: PrDiscussionRepository;
  readonly gitPlatformProvider?: IGitPlatformProvider | undefined;
  readonly inferenceProvider?: IInferenceProvider | undefined;
  readonly repoOwner?: string | undefined;
  readonly repoName?: string | undefined;
}

/**
 * DomainAdvisoryEvaluator
 *
 * Implements Phase 108:
 * Dispatches domain-specific evaluations (Security, Authentication, UX/UI, Playwright E2E, Architecture)
 * to assess pull requests, identify architectural anti-patterns or optimization opportunities,
 * and post threaded advisory recommendations both to the local repository and to remote Gitea PRs.
 */
export class DomainAdvisoryEvaluator {
  private readonly discussionRepo: PrDiscussionRepository;
  private readonly gitPlatformProvider?: IGitPlatformProvider | undefined;
  private readonly repoOwner: string;
  private readonly repoName: string;

  constructor(options: DomainAdvisoryEvaluatorOptions) {
    this.discussionRepo = options.discussionRepo;
    this.gitPlatformProvider = options.gitPlatformProvider;
    this.repoOwner =
      options.repoOwner ||
      process.env.GIT_REPO_OWNER ||
      process.env.GITEA_ADMIN_USER ||
      "NeXeN";
    this.repoName = options.repoName || "cacophony";
  }

  /**
   * Generates domain-specific advisory tips based on code changes and prompt context.
   */
  public analyzeCodeChange(
    context: DomainAdvisoryEvaluationContext,
  ): DomainAdvisoryTip[] {
    const tips: DomainAdvisoryTip[] = [];
    const diff = context.diff || "";
    const focus = context.focusFiles || "";

    // 1. Security Domain Analysis
    if (
      diff.includes("exec(") ||
      diff.includes("spawn(") ||
      diff.includes("run_command") ||
      diff.includes("child_process")
    ) {
      tips.push({
        domain: "Security",
        authorName: "SecurityAdvisoryBot",
        authorRole: "model:security",
        title: "Subprocess Execution Guardrail Verification",
        recommendation:
          "Subprocess invocation detected in diff. Verify ExecutionGuard path traversal and shell injection escaping are applied.",
        severity: "warning",
        filePath: context.focusFiles || undefined,
      });
    }

    // 2. Authentication Domain Analysis
    if (
      diff.includes("jwt") ||
      diff.includes("token") ||
      diff.includes("auth") ||
      focus.includes("auth")
    ) {
      tips.push({
        domain: "Authentication",
        authorName: "AuthAuditorBot",
        authorRole: "model:auth",
        title: "Session & Token Expiry Guardrails",
        recommendation:
          "Authentication code change detected. Ensure tokens use validated algorithms, expired sessions are safely revoked, and zero secrets appear in code.",
        severity: "info",
        filePath: context.focusFiles || undefined,
      });
    }

    // 3. UX/UI & Mobile-First Domain Analysis
    if (
      diff.includes(".component.html") ||
      diff.includes(".component.css") ||
      diff.includes("<div") ||
      diff.includes("overflow") ||
      focus.includes("frontend")
    ) {
      tips.push({
        domain: "UX/UI",
        authorName: "UxUiAdvisoryBot",
        authorRole: "model:ux-ui",
        title: "Mobile-First Viewport Density & Double-Scroller Prevention",
        recommendation:
          "Frontend changes must enforce mobile-first responsive density, default embedded scrollable regions to full height to prevent scroll trapping, and provide corner shrink controls.",
        severity: "info",
        filePath: context.focusFiles || undefined,
      });
    }

    // 4. Playwright & E2E Testing Domain Analysis
    if (
      diff.includes(".spec.ts") ||
      diff.includes("test") ||
      diff.includes("playwright") ||
      focus.includes("test")
    ) {
      tips.push({
        domain: "Playwright E2E",
        authorName: "PlaywrightAdvisorBot",
        authorRole: "model:e2e-playwright",
        title: "Single-Concurrency Host Pacing & E2E Verification",
        recommendation:
          "When running browser-based E2E tests, wait in single-concurrency line to avoid Vega APU or host RAM exhaustion before emitting PR merge approval.",
        severity: "info",
        filePath: context.focusFiles || undefined,
      });
    }

    // 5. Architecture & SOLID Domain Analysis
    if (tips.length === 0 || diff.includes("class ") || diff.includes("interface ")) {
      tips.push({
        domain: "Architecture",
        authorName: "ArchitectureAdvisorBot",
        authorRole: "model:architecture",
        title: "SOLID Principles & Loose Coupling Validation",
        recommendation:
          "Ensure single responsibility principle is maintained, interfaces are segregated, and no quick-mock data is hardcoded without database migrations.",
        severity: "info",
        filePath: context.focusFiles || undefined,
      });
    }

    return tips;
  }

  /**
   * Evaluates a PR, persists advisory comments into the discussion repository,
   * and optionally submits them to the remote Gitea PR discussion.
   */
  public async evaluateAndPublishAdvice(
    context: DomainAdvisoryEvaluationContext,
  ): Promise<PrDiscussionComment[]> {
    const tips = this.analyzeCodeChange(context);
    const recordedComments: PrDiscussionComment[] = [];

    for (const tip of tips) {
      const threadId = `advisory_${context.taskId}_${tip.domain.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const bodyContent = `**[${tip.domain} Advisory] ${tip.title}**\n\n${tip.recommendation}`;

      const comment = await this.discussionRepo.recordComment({
        taskId: context.taskId,
        prIndex: context.prIndex,
        threadId,
        authorName: tip.authorName,
        authorRole: tip.authorRole,
        domainTag: tip.domain,
        filePath: tip.filePath || null,
        lineNumber: tip.lineNumber || null,
        bodyContent,
        isResolved: false,
      });

      recordedComments.push(comment);

      // Optionally post to Gitea if provider is available
      if (this.gitPlatformProvider?.createIssueComment && context.prIndex > 0) {
        try {
          await this.gitPlatformProvider.createIssueComment(
            this.repoOwner,
            this.repoName,
            context.prIndex,
            bodyContent,
          );
        } catch {
          // Keep resilient if remote forge is unreachable
        }
      }
    }

    return recordedComments;
  }
}
