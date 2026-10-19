import type { TaskRepository } from "@cacophony/db";
import type { TaskRecord } from "@cacophony/shared-types";
import type {
  IGitPlatformProvider,
  GitPlatformIssue,
  GitPlatformPullRequest,
  DependabotSecurityAlert,
  CloseGitIssueOptions,
} from "./IGitPlatformProvider.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";

export interface GitHubSecurityAndIssueBridgeOptions {
  readonly githubProvider: IGitPlatformProvider;
  readonly giteaProvider: IGitPlatformProvider;
  readonly taskRepo: TaskRepository;
  readonly inferenceProvider?: IInferenceProvider | undefined;
  readonly defaultReasoningModel?: string | undefined;
}

export interface DependabotSyncResult {
  readonly totalIngested: number;
  readonly createdGiteaIssues: readonly GitPlatformIssue[];
  readonly enqueuedTaskIds: readonly string[];
}

export interface ExternalSyncResult {
  readonly issuesIngested: number;
  readonly prsIngested: number;
  readonly createdGiteaIssues: readonly GitPlatformIssue[];
  readonly enqueuedTaskIds: readonly string[];
}

export interface PromotionVerificationOptions {
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly giteaOwner: string;
  readonly giteaRepo: string;
  readonly itemType: "issue" | "pr";
  readonly externalNumber: number;
  readonly giteaIssueNumber?: number | undefined;
  readonly resolutionVerdict: string;
  readonly verifierModel?: string | undefined;
  readonly mergeCommitTitle?: string | undefined;
}

export interface PromotionVerificationResult {
  readonly success: boolean;
  readonly itemType: "issue" | "pr";
  readonly externalNumber: number;
  readonly merged?: boolean | undefined;
  readonly closed?: boolean | undefined;
  readonly commentPosted: boolean;
  readonly notes: string;
}

/**
 * GitHubSecurityAndIssueBridge
 *
 * Implements bidirectional synchronization and reasoning evaluation between public GitHub
 * repositories and internal Gitea instances.
 *
 * Capabilities:
 * 1. Dependabot Alert Ingestion: Ingests GitHub security advisories, analyzes CVE severity
 *    and architecture impact via a reasoning model, documents them as internal Gitea issues,
 *    and enqueues high-priority arena tasks.
 * 2. External Issue/PR Ingestion: Reviews external GitHub issues and PRs with reasoning models,
 *    mirrors them to local Gitea, and queues them for autonomous arena execution.
 * 3. Bidirectional Resolution Promotion: Once changes are validated and green in local staging,
 *    pushes fixes, squash-merges PRs, comments with reasoning verdicts, and closes GitHub issues.
 */
export class GitHubSecurityAndIssueBridge {
  private readonly githubProvider: IGitPlatformProvider;
  private readonly giteaProvider: IGitPlatformProvider;
  private readonly taskRepo: TaskRepository;
  private readonly inferenceProvider?: IInferenceProvider | undefined;
  private readonly reasoningModel: string;

  constructor(options: GitHubSecurityAndIssueBridgeOptions) {
    this.githubProvider = options.githubProvider;
    this.giteaProvider = options.giteaProvider;
    this.taskRepo = options.taskRepo;
    this.inferenceProvider = options.inferenceProvider;
    this.reasoningModel =
      options.defaultReasoningModel ||
      process.env.REASONING_MODEL ||
      "deepseek-r1:8b";
  }

  /**
   * Ingests open Dependabot alerts from GitHub, evaluates remediation strategies
   * via the reasoning model, creates internal Gitea tracking issues, and enqueues arena tasks.
   */
  public async syncDependabotAlerts(options: {
    readonly githubOwner: string;
    readonly githubRepo: string;
    readonly giteaOwner: string;
    readonly giteaRepo: string;
  }): Promise<DependabotSyncResult> {
    if (typeof this.githubProvider.listDependabotAlerts !== "function") {
      return { totalIngested: 0, createdGiteaIssues: [], enqueuedTaskIds: [] };
    }

    const alerts = await this.githubProvider.listDependabotAlerts(
      options.githubOwner,
      options.githubRepo,
      "open",
    );

    const createdGiteaIssues: GitPlatformIssue[] = [];
    const enqueuedTaskIds: string[] = [];

    for (const alert of alerts) {
      const taskId = `gh-dependabot-${alert.number}`;
      const title = `[Dependabot ${alert.severity.toUpperCase()}] ${alert.dependencyPackage} - ${alert.securityAdvisorySummary}`;

      // Check if arena task already exists
      const existing = await this.taskRepo.getByTitle(title);
      if (existing) {
        continue;
      }

      // Generate reasoning analysis on vulnerability impact and remediation
      const reasoningAnalysis = await this.evaluateSecurityAdvisory(alert);

      const issueBody = [
        `## GitHub Dependabot Security Advisory`,
        `- **Advisory**: ${alert.securityAdvisorySummary}`,
        `- **Severity**: \`${alert.severity.toUpperCase()}\``,
        `- **Package**: \`${alert.dependencyPackage}\` (${alert.dependencyEcosystem})`,
        alert.cveId ? `- **CVE**: \`${alert.cveId}\`` : "",
        `- **Original Alert**: [GitHub Alert #${alert.number}](${alert.htmlUrl})`,
        ``,
        `### Advisory Description`,
        alert.securityAdvisoryDescription,
        ``,
        `### Reasoning Impact Analysis & Remediation Strategy`,
        reasoningAnalysis,
      ]
        .filter((line) => line !== "")
        .join("\n");

      let giteaIssue: GitPlatformIssue | undefined;
      if (typeof this.giteaProvider.createIssue === "function") {
        try {
          giteaIssue = await this.giteaProvider.createIssue(
            options.giteaOwner,
            options.giteaRepo,
            {
              title,
              body: issueBody,
              labels: [
                "security",
                "dependabot",
                alert.severity.toLowerCase(),
              ],
            },
          );
          createdGiteaIssues.push(giteaIssue);
        } catch (err) {
          console.warn(
            `[GitHubSecurityAndIssueBridge] Failed to create Gitea issue for alert #${alert.number}:`,
            err,
          );
        }
      }

      const priority =
        alert.severity === "critical" || alert.severity === "high"
          ? "P0"
          : "P1";

      const taskRecord: TaskRecord = {
        id: taskId,
        title,
        prompt: `[DEPENDABOT REMEDIATION]: ${title}\n\n${issueBody}`,
        role: "security_auditor",
        status: "PENDING",
        priority,
        modelAssigned: null,
        testCommand: "npm test",
        focusFiles: "package.json",
        targetBranch: "main",
        prUrl: giteaIssue?.htmlUrl ?? alert.htmlUrl,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };

      await this.taskRepo.create(taskRecord);
      enqueuedTaskIds.push(taskId);
    }

    return {
      totalIngested: enqueuedTaskIds.length,
      createdGiteaIssues,
      enqueuedTaskIds,
    };
  }

  /**
   * Ingests open GitHub issues and pull requests, conducts reasoning review,
   * mirrors them to internal Gitea, and enqueues corresponding arena tasks.
   */
  public async syncGitHubIssuesAndPrs(options: {
    readonly githubOwner: string;
    readonly githubRepo: string;
    readonly giteaOwner: string;
    readonly giteaRepo: string;
  }): Promise<ExternalSyncResult> {
    const createdGiteaIssues: GitPlatformIssue[] = [];
    const enqueuedTaskIds: string[] = [];
    let issuesIngested = 0;
    let prsIngested = 0;

    // 1. Sync GitHub Issues
    if (typeof this.githubProvider.listIssues === "function") {
      const issues = await this.githubProvider.listIssues(
        options.githubOwner,
        options.githubRepo,
        "open",
      );

      for (const issue of issues) {
        const taskId = `gh-issue-${issue.number}`;
        const title = `[GitHub Issue #${issue.number}] ${issue.title}`;

        const existing = await this.taskRepo.getByTitle(title);
        if (existing) {
          continue;
        }

        const analysis = await this.evaluateExternalIssue(issue);
        const mirrorBody = [
          `## Mirrored External GitHub Issue #${issue.number}`,
          `- **Original Title**: ${issue.title}`,
          `- **Original URL**: [${issue.htmlUrl}](${issue.htmlUrl})`,
          `- **Reported Labels**: ${(issue.labels ?? []).join(", ") || "None"}`,
          ``,
          `### Original Description`,
          issue.body || "No description provided.",
          ``,
          `### Reasoning Architectural Assessment`,
          analysis,
        ].join("\n");

        let giteaIssue: GitPlatformIssue | undefined;
        if (typeof this.giteaProvider.createIssue === "function") {
          try {
            giteaIssue = await this.giteaProvider.createIssue(
              options.giteaOwner,
              options.giteaRepo,
              {
                title,
                body: mirrorBody,
                labels: ["github-mirror", "community-issue"],
              },
            );
            createdGiteaIssues.push(giteaIssue);
          } catch (err) {
            console.warn(
              `[GitHubSecurityAndIssueBridge] Failed to mirror issue #${issue.number} to Gitea:`,
              err,
            );
          }
        }

        const taskRecord: TaskRecord = {
          id: taskId,
          title,
          prompt: `[GITHUB ISSUE RESOLUTION]: ${title}\n\n${mirrorBody}`,
          role: "implementer",
          status: "PENDING",
          priority: "P1",
          modelAssigned: null,
          testCommand: "npm test",
          focusFiles: null,
          targetBranch: "main",
          prUrl: giteaIssue?.htmlUrl ?? issue.htmlUrl,
          failureCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        };

        await this.taskRepo.create(taskRecord);
        enqueuedTaskIds.push(taskId);
        issuesIngested++;
      }
    }

    // 2. Sync GitHub Pull Requests
    if (typeof this.githubProvider.listPullRequests === "function") {
      const prs = await this.githubProvider.listPullRequests(
        options.githubOwner,
        options.githubRepo,
        "open",
      );

      for (const pr of prs) {
        const taskId = `gh-pr-${pr.number}`;
        const title = `[GitHub PR Review #${pr.number}] ${pr.title}`;

        const existing = await this.taskRepo.getByTitle(title);
        if (existing) {
          continue;
        }

        let diff = "";
        try {
          diff = await this.githubProvider.getPullRequestDiff(
            options.githubOwner,
            options.githubRepo,
            pr.number,
          );
        } catch {
          // Non-fatal if diff fetch fails
        }

        const prReviewNotes = await this.evaluateExternalPr(pr, diff);
        const mirrorPrBody = [
          `## Mirrored External GitHub PR #${pr.number}`,
          `- **Original Title**: ${pr.title}`,
          `- **Author Head**: \`${pr.headRef}\` -> Base: \`${pr.baseRef}\``,
          `- **Original URL**: [${pr.htmlUrl}](${pr.htmlUrl})`,
          ``,
          `### External PR Description`,
          pr.body || "No description provided.",
          ``,
          `### Reasoning Review & SOLID Critique`,
          prReviewNotes,
        ].join("\n");

        let giteaIssue: GitPlatformIssue | undefined;
        if (typeof this.giteaProvider.createIssue === "function") {
          try {
            giteaIssue = await this.giteaProvider.createIssue(
              options.giteaOwner,
              options.giteaRepo,
              {
                title,
                body: mirrorPrBody,
                labels: ["github-mirror", "community-pr", "review-pending"],
              },
            );
            createdGiteaIssues.push(giteaIssue);
          } catch (err) {
            console.warn(
              `[GitHubSecurityAndIssueBridge] Failed to mirror PR #${pr.number} to Gitea:`,
              err,
            );
          }
        }

        const taskRecord: TaskRecord = {
          id: taskId,
          title,
          prompt: `[GITHUB PR VERIFICATION]: ${title}\n\n${mirrorPrBody}`,
          role: "reviewer",
          status: "PENDING",
          priority: "P0",
          modelAssigned: null,
          testCommand: "npm test",
          focusFiles: null,
          targetBranch: pr.baseRef || "main",
          prUrl: giteaIssue?.htmlUrl ?? pr.htmlUrl,
          failureCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        };

        await this.taskRepo.create(taskRecord);
        enqueuedTaskIds.push(taskId);
        prsIngested++;
      }
    }

    return {
      issuesIngested,
      prsIngested,
      createdGiteaIssues,
      enqueuedTaskIds,
    };
  }

  /**
   * Promotes verified work back to GitHub: closes resolved issues with reasoning signatures
   * or merges approved pull requests after passing arena test execution.
   */
  public async promoteVerifiedResolution(
    options: PromotionVerificationOptions,
  ): Promise<PromotionVerificationResult> {
    const verifierSignature = options.verifierModel
      ? `Verified by model: **${options.verifierModel}**`
      : `Verified by reasoning model: **${this.reasoningModel}**`;

    const comment = [
      `## Cacophony Autonomous Verification Complete`,
      options.resolutionVerdict,
      ``,
      `> ${verifierSignature}`,
    ].join("\n");

    let commentPosted = false;
    let merged = false;
    let closed = false;

    if (options.itemType === "issue") {
      // Close GitHub Issue
      if (typeof this.githubProvider.closeIssue === "function") {
        try {
          const closeOpts: CloseGitIssueOptions = { comment };
          await this.githubProvider.closeIssue(
            options.githubOwner,
            options.githubRepo,
            options.externalNumber,
            closeOpts,
          );
          closed = true;
          commentPosted = true;
        } catch (err) {
          console.warn(
            `[GitHubSecurityAndIssueBridge] Failed to close GitHub issue #${options.externalNumber}:`,
            err,
          );
        }
      }

      // Close internal Gitea tracking issue if known
      if (
        options.giteaIssueNumber &&
        typeof this.giteaProvider.closeIssue === "function"
      ) {
        try {
          await this.giteaProvider.closeIssue(
            options.giteaOwner,
            options.giteaRepo,
            options.giteaIssueNumber,
            { comment: `Mirror closed following verification push to GitHub.` },
          );
        } catch {
          // Non-fatal
        }
      }

      return {
        success: closed,
        itemType: "issue",
        externalNumber: options.externalNumber,
        closed,
        commentPosted,
        notes: `GitHub issue #${options.externalNumber} resolved and closed.`,
      };
    } else {
      // PR Promotion: Submit review comment & merge
      if (typeof this.githubProvider.createIssueComment === "function") {
        try {
          await this.githubProvider.createIssueComment(
            options.githubOwner,
            options.githubRepo,
            options.externalNumber,
            comment,
          );
          commentPosted = true;
        } catch {
          // Non-fatal
        }
      }

      try {
        merged = await this.githubProvider.mergePullRequest(
          options.githubOwner,
          options.githubRepo,
          options.externalNumber,
          {
            mergeMethod: "squash",
            title:
              options.mergeCommitTitle ||
              `fix(upstream): Squash merge PR #${options.externalNumber} verified by ${this.reasoningModel}`,
          },
        );
      } catch (err) {
        console.warn(
          `[GitHubSecurityAndIssueBridge] Failed to merge GitHub PR #${options.externalNumber}:`,
          err,
        );
      }

      // Close internal tracking issue in Gitea
      if (
        options.giteaIssueNumber &&
        typeof this.giteaProvider.closeIssue === "function"
      ) {
        try {
          await this.giteaProvider.closeIssue(
            options.giteaOwner,
            options.giteaRepo,
            options.giteaIssueNumber,
            { comment: `Mirrored PR #${options.externalNumber} merged on GitHub.` },
          );
        } catch {
          // Non-fatal
        }
      }

      return {
        success: merged,
        itemType: "pr",
        externalNumber: options.externalNumber,
        merged,
        commentPosted,
        notes: merged
          ? `GitHub PR #${options.externalNumber} successfully merged.`
          : `GitHub PR #${options.externalNumber} verification posted; manual merge required.`,
      };
    }
  }

  private async evaluateSecurityAdvisory(
    alert: DependabotSecurityAlert,
  ): Promise<string> {
    if (!this.inferenceProvider) {
      return (
        `Severity: ${alert.severity.toUpperCase()}\n` +
        `Remediation: Upgrade dependency ${alert.dependencyPackage} (${alert.dependencyEcosystem}) to patched release.`
      );
    }

    try {
      const prompt = [
        `You are a principal security engineer reviewing a Dependabot security alert.`,
        `Package: ${alert.dependencyPackage} (${alert.dependencyEcosystem})`,
        `Severity: ${alert.severity}`,
        `Summary: ${alert.securityAdvisorySummary}`,
        `Description: ${alert.securityAdvisoryDescription}`,
        alert.cveId ? `CVE: ${alert.cveId}` : "",
        ``,
        `Provide a concise 3-paragraph impact analysis:`,
        `1. Vulnerability mechanism and potential exploit vector in a monorepo setup.`,
        `2. Architectural blast radius across consumers.`,
        `3. Concrete upgrade path and breaking changes to inspect during TDD testing.`,
      ].join("\n");

      const response = await this.inferenceProvider.generate({
        model: this.reasoningModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      return response.content.trim();
    } catch {
      return `Automated analysis fallback: Upgrade ${alert.dependencyPackage} to resolve ${alert.securityAdvisorySummary}.`;
    }
  }

  private async evaluateExternalIssue(issue: GitPlatformIssue): Promise<string> {
    if (!this.inferenceProvider) {
      return `Issue ${issue.number}: ${issue.title}. Requires investigation and TDD reproduction test.`;
    }

    try {
      const prompt = [
        `You are a principal architect reviewing a GitHub community issue.`,
        `Title: ${issue.title}`,
        `Body:`,
        issue.body || "No body provided",
        ``,
        `Provide a concise architectural assessment:`,
        `1. Core problem statement and likely failure point.`,
        `2. SOLID design principles to uphold while refactoring this behavior.`,
        `3. Recommended test command and regression verification invariant.`,
      ].join("\n");

      const response = await this.inferenceProvider.generate({
        model: this.reasoningModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      return response.content.trim();
    } catch {
      return `Architectural assessment: Implement regression test case reproducing issue #${issue.number} before fixing.`;
    }
  }

  private async evaluateExternalPr(
    pr: GitPlatformPullRequest,
    diff: string,
  ): Promise<string> {
    if (!this.inferenceProvider) {
      return `Pull Request #${pr.number}: ${pr.title}. Changes inspected. Ready for staged sandboxed test validation.`;
    }

    try {
      const truncatedDiff = diff.slice(0, 4000);
      const prompt = [
        `You are a principal code reviewer reviewing an external pull request.`,
        `Title: ${pr.title}`,
        `Head: ${pr.headRef} -> Base: ${pr.baseRef}`,
        `Description: ${pr.body || "None"}`,
        `Diff excerpt:`,
        `\`\`\`diff`,
        truncatedDiff,
        `\`\`\``,
        ``,
        `Evaluate:`,
        `1. Code quality, SOLID compliance, and typing strictness.`,
        `2. Potential regressions, security boundary breaches, or performance anti-patterns.`,
        `3. Final verdict: APPROVE, REQUEST_CHANGES, or NEUTRAL.`,
      ].join("\n");

      const response = await this.inferenceProvider.generate({
        model: this.reasoningModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      return response.content.trim();
    } catch {
      return `Review verdict: Staged sandboxed test run required to verify PR #${pr.number} invariants.`;
    }
  }
}
