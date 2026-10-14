import type { StructuredAssessmentReport, AssessmentFinding } from "@cacophony/shared-types";
import type { ReviewReportRepository } from "@cacophony/db";
import type { GiteaApiClient } from "./GiteaApiClient.js";
import type { CreateReviewCommentRequest, SubmitReviewRequest } from "./giteaTypes.js";

export interface PublishPrAssessmentOptions {
  readonly owner: string;
  readonly repo: string;
  readonly prNumber: number;
  readonly report: StructuredAssessmentReport;
}

export interface PrAssessmentPublishOutcome {
  readonly success: boolean;
  readonly verdict: string;
  readonly modelIdentity: string;
  readonly findingsCount: number;
  readonly criticalCount: number;
  readonly blockerCount: number;
  readonly commentPosted: boolean;
  readonly reviewSubmitted: boolean;
  readonly persisted: boolean;
  readonly error?: string | undefined;
}

/**
 * PrAssessmentPublisher
 *
 * Publishes independent model assessments, structured reviews, and inline comments
 * to the Gitea PR timeline. Crucially, does NOT reopen or mutate closed implementation tasks.
 */
export class PrAssessmentPublisher {
  private readonly giteaClient: GiteaApiClient;
  private readonly reviewReportRepo?: ReviewReportRepository | undefined;

  constructor(
    giteaClient: GiteaApiClient,
    reviewReportRepo?: ReviewReportRepository,
  ) {
    this.giteaClient = giteaClient;
    this.reviewReportRepo = reviewReportRepo;
  }

  /**
   * Publishes the assessment report to Gitea and optionally persists to the database.
   */
  public async publishPrAssessment(
    options: PublishPrAssessmentOptions,
  ): Promise<PrAssessmentPublishOutcome> {
    const { owner, repo, prNumber, report } = options;

    let reviewSubmitted = false;
    let commentPosted = false;
    let persisted = false;

    const blockerCount = report.findings.filter((f) => f.severity === "blocker").length;
    const criticalCount = report.findings.filter((f) => f.severity === "critical").length;

    // 1. Build formatted markdown critique
    const summaryMarkdown = this.buildSummaryMarkdown(report);

    // 2. Build inline review comments for findings with line numbers
    const inlineComments: CreateReviewCommentRequest[] = report.findings
      .filter((f) => f.path && f.lineNumber)
      .map((f) => ({
        path: f.path,
        line: f.lineNumber,
        body: this.formatFindingComment(f),
      }));

    const event =
      report.verdict === "APPROVE"
        ? "APPROVED"
        : report.verdict === "REQUEST_CHANGES"
          ? "REQUEST_CHANGES"
          : "COMMENT";

    // 3. Submit structured review via Gitea Review API
    try {
      const reviewPayload: SubmitReviewRequest = {
        event,
        body: summaryMarkdown,
        comments: inlineComments.length > 0 ? inlineComments : undefined,
      };

      await this.giteaClient.submitPullRequestReview(
        owner,
        repo,
        prNumber,
        reviewPayload,
      );
      reviewSubmitted = true;
    } catch {
      // Self-review or inline review comment error: fallback to PR issue comment
      try {
        await this.giteaClient.createIssueComment(owner, repo, prNumber, {
          body: summaryMarkdown,
        });
        commentPosted = true;
      } catch (commentErr: unknown) {
        const errMsg = commentErr instanceof Error ? commentErr.message : String(commentErr);
        return {
          success: false,
          verdict: report.verdict,
          modelIdentity: report.modelIdentity,
          findingsCount: report.findings.length,
          criticalCount,
          blockerCount,
          commentPosted: false,
          reviewSubmitted: false,
          persisted: false,
          error: `Failed to post assessment to PR #${prNumber}: ${errMsg}`,
        };
      }
    }

    // 4. Persist structured report to database if repository is configured
    if (this.reviewReportRepo) {
      try {
        await this.reviewReportRepo.saveReport(report);
        persisted = true;
      } catch (dbErr: unknown) {
        console.warn("[PrAssessmentPublisher] Failed to persist review report:", dbErr);
      }
    }

    return {
      success: true,
      verdict: report.verdict,
      modelIdentity: report.modelIdentity,
      findingsCount: report.findings.length,
      criticalCount,
      blockerCount,
      commentPosted: commentPosted || reviewSubmitted,
      reviewSubmitted,
      persisted,
    };
  }

  private buildSummaryMarkdown(report: StructuredAssessmentReport): string {
    const lines: string[] = [
      `## Independent PR Assessment (Round ${report.round})`,
      "",
      `| Evaluator Model | Head SHA | Verdict | CI Outcome |`,
      `| :--- | :--- | :--- | :--- |`,
      `| \`${report.modelIdentity}\` | \`${report.headSha.slice(0, 8)}\` | **${report.verdict}** | \`${report.ciOutcome ?? "n/a"}\` |`,
      "",
      `### Summary`,
      report.summary,
      "",
    ];

    if (report.findings.length > 0) {
      lines.push("### Findings", "");
      for (const f of report.findings) {
        lines.push(
          `- **[${f.severity.toUpperCase()}]** \`${f.category}\` in \`${f.path}${f.lineNumber ? `:${f.lineNumber}` : ""}\`: ${f.message}`,
        );
        if (f.deterministicFixHint) {
          lines.push(`  - Deterministic Fix Hint: \`${f.deterministicFixHint}\``);
        }
        if (f.rationale) {
          lines.push(`  - Rationale: ${f.rationale}`);
        }
      }
      lines.push("");
    } else {
      lines.push("### Findings", "No defects, anti-patterns, or regressions identified.", "");
    }

    if (report.testEvidence) {
      lines.push(
        "### Test Evidence",
        "```",
        report.testEvidence.trim(),
        "```",
        "",
      );
    }

    lines.push("> Generated by Cacophony Autonomous PR Assessment Framework.");
    return lines.join("\n");
  }

  private formatFindingComment(f: AssessmentFinding): string {
    const parts = [
      `**[${f.severity.toUpperCase()}] ${f.category}**`,
      "",
      f.message,
    ];
    if (f.deterministicFixHint) {
      parts.push("", `**Suggested Fix:** \`${f.deterministicFixHint}\``);
    }
    if (f.rationale) {
      parts.push("", `*Rationale:* ${f.rationale}`);
    }
    return parts.join("\n");
  }
}
