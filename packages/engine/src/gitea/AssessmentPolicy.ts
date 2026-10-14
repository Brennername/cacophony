import type { StructuredAssessmentReport } from "@cacophony/shared-types";

export interface AssessmentPolicyConfig {
  readonly minIndependentReviewers?: number | undefined;
  readonly requirePassingCi?: boolean | undefined;
}

export interface AssessmentPolicyEvaluationInput {
  readonly reports: readonly StructuredAssessmentReport[];
  readonly ciStatus?: string | undefined;
  readonly isCodeModifying?: boolean | undefined;
  readonly authorModel?: string | undefined;
}

export interface AssessmentPolicyResult {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
  readonly approvedCount: number;
  readonly requiredCount: number;
  readonly criticalFindingCount: number;
  readonly blockerFindingCount: number;
  readonly warningCount: number;
  readonly independentModels: readonly string[];
}

/**
 * Enforces rigorous merge gates for autonomous Pull Requests.
 *
 * Rules:
 * - T88.3.1: Code-modifying PRs require at least 2 distinct independent model assessments.
 * - T88.3.2: Rejects auto-merge if any critical or blocker finding exists, or if any reviewer requests changes.
 * - Enforces green CI status checks before merge eligibility is granted.
 */
export class AssessmentPolicy {
  private readonly minIndependentReviewers: number;
  private readonly requirePassingCi: boolean;

  constructor(config: AssessmentPolicyConfig = {}) {
    this.minIndependentReviewers = config.minIndependentReviewers ?? 2;
    this.requirePassingCi = config.requirePassingCi ?? true;
  }

  /**
   * Evaluates the assessment reports and CI status against merge policy gates.
   */
  public evaluate(input: AssessmentPolicyEvaluationInput): AssessmentPolicyResult {
    const reasons: string[] = [];
    const isCodeModifying = input.isCodeModifying ?? true;
    const requiredCount = isCodeModifying ? this.minIndependentReviewers : 1;

    // Filter reports from independent models (excluding author self-review)
    const validReports = input.reports.filter((r) => {
      if (input.authorModel && r.modelIdentity === input.authorModel) {
        return false;
      }
      return true;
    });

    const distinctModels = Array.from(new Set(validReports.map((r) => r.modelIdentity)));

    let approvedCount = 0;
    let criticalFindingCount = 0;
    let blockerFindingCount = 0;
    let warningCount = 0;

    for (const report of validReports) {
      if (report.verdict === "APPROVE") {
        approvedCount++;
      } else if (report.verdict === "REQUEST_CHANGES") {
        reasons.push(
          `Reviewer '${report.modelIdentity}' requested changes: ${report.summary}`,
        );
      }

      for (const finding of report.findings) {
        if (finding.severity === "blocker") {
          blockerFindingCount++;
          reasons.push(
            `[BLOCKER] ${finding.category} in ${finding.path}:${finding.lineNumber ?? 0}: ${finding.message}`,
          );
        } else if (finding.severity === "critical") {
          criticalFindingCount++;
          reasons.push(
            `[CRITICAL] ${finding.category} in ${finding.path}:${finding.lineNumber ?? 0}: ${finding.message}`,
          );
        } else if (finding.severity === "high" || finding.severity === "medium") {
          warningCount++;
        }
      }
    }

    // CI Verification Gate
    if (this.requirePassingCi) {
      const ciGreen =
        input.ciStatus &&
        (input.ciStatus.toLowerCase() === "success" ||
          input.ciStatus.toLowerCase() === "passed");
      if (!ciGreen) {
        reasons.push(
          `CI status check is not passing (current: '${input.ciStatus ?? "unknown"}')`,
        );
      }
    }

    // Minimum Independent Reviewers Gate (T88.3.1)
    if (distinctModels.length < requiredCount) {
      reasons.push(
        `Insufficient independent model reviews: received ${distinctModels.length}, required ${requiredCount}`,
      );
    }

    // Approval Count Gate
    if (approvedCount < requiredCount) {
      reasons.push(
        `Insufficient approvals: received ${approvedCount}, required ${requiredCount}`,
      );
    }

    const eligible = reasons.length === 0;

    return {
      eligible,
      reasons,
      approvedCount,
      requiredCount,
      criticalFindingCount,
      blockerFindingCount,
      warningCount,
      independentModels: distinctModels,
    };
  }
}
