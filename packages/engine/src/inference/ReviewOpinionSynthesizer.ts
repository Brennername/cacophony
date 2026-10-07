import {
  ReviewVerdict,
  PersonaFinding,
} from "@cacophony/shared-types";
import { CandidateReviewExecution } from "./MultiModelConsensusCoordinator.js";

export interface UnifiedFinding extends PersonaFinding {
  readonly reportingModels: readonly string[];
  readonly reportingPersonas: readonly string[];
}

export interface ConsensusReviewSynthesis {
  readonly consensusVerdict: ReviewVerdict;
  readonly approvalCount: number;
  readonly requestChangesCount: number;
  readonly unifiedFindings: readonly UnifiedFinding[];
  readonly markdownComment: string;
}

/**
 * ReviewOpinionSynthesizer
 *
 * Merges multi-model review verdicts and findings into a coherent consensus decision:
 * 1. Unifies findings across models and personas, deduplicating overlaps.
 * 2. Computes aggregate consensus verdict (blocker-sensitive and majority-based).
 * 3. Formats an actionable, structured markdown review comment for Gitea/GitHub PRs.
 */
export class ReviewOpinionSynthesizer {
  /**
   * Synthesizes candidate reviews into a final consensus review and markdown comment.
   */
  public static synthesize(
    executions: readonly CandidateReviewExecution[]
  ): ConsensusReviewSynthesis {
    if (executions.length === 0) {
      return {
        consensusVerdict: "APPROVE",
        approvalCount: 0,
        requestChangesCount: 0,
        unifiedFindings: [],
        markdownComment: "### Autonomous Review Consensus\nNo candidate reviews were submitted.",
      };
    }

    let approvalCount = 0;
    let requestChangesCount = 0;

    for (const exec of executions) {
      if (exec.result.verdict === "APPROVE") {
        approvalCount++;
      } else {
        requestChangesCount++;
      }
    }

    // Deduplicate and aggregate findings
    const unifiedFindings = this.aggregateFindings(executions);

    // Blocker findings immediately mandate REQUEST_CHANGES
    const hasBlockers = unifiedFindings.some((f) => f.severity === "blocker");
    const consensusVerdict: ReviewVerdict =
      hasBlockers || requestChangesCount >= approvalCount
        ? "REQUEST_CHANGES"
        : "APPROVE";

    const markdownComment = this.formatMarkdownComment(
      consensusVerdict,
      approvalCount,
      requestChangesCount,
      executions,
      unifiedFindings
    );

    return {
      consensusVerdict,
      approvalCount,
      requestChangesCount,
      unifiedFindings,
      markdownComment,
    };
  }

  /**
   * Aggregates and deduplicates findings from multiple candidate models.
   */
  private static aggregateFindings(
    executions: readonly CandidateReviewExecution[]
  ): readonly UnifiedFinding[] {
    const findingsMap = new Map<string, {
      path: string;
      lineNumber?: number | undefined;
      ruleId?: string | undefined;
      message: string;
      severity: "info" | "warning" | "blocker";
      suggestion?: string | undefined;
      reportingModels: Set<string>;
      reportingPersonas: Set<string>;
    }>();

    for (const exec of executions) {
      for (const finding of exec.result.findings) {
        // Normalization key based on path and message core
        const key = `${finding.path}:${finding.lineNumber ?? "any"}:${finding.message.slice(0, 40).toLowerCase()}`;
        const existing = findingsMap.get(key);

        if (existing) {
          existing.reportingModels.add(exec.modelId);
          existing.reportingPersonas.add(exec.persona);
          // Elevate severity if higher
          if (finding.severity === "blocker") {
            existing.severity = "blocker";
          } else if (finding.severity === "warning" && existing.severity === "info") {
            existing.severity = "warning";
          }
          if (finding.suggestion && !existing.suggestion) {
            existing.suggestion = finding.suggestion;
          }
        } else {
          findingsMap.set(key, {
            path: finding.path,
            lineNumber: finding.lineNumber,
            ruleId: finding.ruleId,
            message: finding.message,
            severity: finding.severity,
            suggestion: finding.suggestion,
            reportingModels: new Set([exec.modelId]),
            reportingPersonas: new Set([exec.persona]),
          });
        }
      }
    }

    return Array.from(findingsMap.values()).map((item) => ({
      path: item.path,
      lineNumber: item.lineNumber,
      ruleId: item.ruleId,
      message: item.message,
      severity: item.severity,
      suggestion: item.suggestion,
      reportingModels: Array.from(item.reportingModels),
      reportingPersonas: Array.from(item.reportingPersonas),
    }));
  }

  /**
   * Formats the final unified review markdown comment.
   */
  private static formatMarkdownComment(
    verdict: ReviewVerdict,
    approvals: number,
    rejections: number,
    executions: readonly CandidateReviewExecution[],
    findings: readonly UnifiedFinding[]
  ): string {
    const verdictBanner =
      verdict === "APPROVE"
        ? "### Review Verdict: APPROVED"
        : "### Review Verdict: CHANGES REQUESTED";

    const lines: string[] = [
      verdictBanner,
      "",
      `**Consensus Vote**: ${approvals} Approvals / ${rejections} Changes Requested across ${executions.length} reviewer models.`,
      "",
      "#### Reviewer Panel Breakdown:",
    ];

    for (const exec of executions) {
      const v = exec.result.verdict;
      lines.push(
        `- **${exec.persona}** (\`${exec.modelId}\`): ${v} (${exec.latencyMs}ms) — ${exec.result.summary}`
      );
    }

    if (findings.length > 0) {
      lines.push("", "#### Actionable Findings & Remediation Items:");
      for (const finding of findings) {
        const loc = finding.lineNumber ? `:${finding.lineNumber}` : "";
        const sev = finding.severity.toUpperCase();
        lines.push(
          `- [${sev}] \`${finding.path}${loc}\`: ${finding.message} *(Reported by: ${finding.reportingPersonas.join(", ")})*`
        );
        if (finding.suggestion) {
          lines.push(`  - *Suggestion*: ${finding.suggestion}`);
        }
      }
    } else {
      lines.push("", "No critical findings or blocking issues were identified.");
    }

    return lines.join("\n");
  }
}
