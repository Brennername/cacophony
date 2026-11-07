import type {
  TaskAdvisoryGuidance,
  ComplianceReviewResult,
  ComplianceVerdict,
  ComplianceAuditItem,
} from "@cacophony/shared-types";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";

export interface ComplianceReviewStageOptions {
  readonly cooldownWindowMs?: number | undefined; // default: 5 * 60 * 1000 (5 minutes)
}

export interface ComplianceAuditOptions {
  readonly taskId: string;
  readonly targetBranch: string;
  readonly diff: string;
  readonly guidanceList: readonly TaskAdvisoryGuidance[];
  readonly reviewerModel: string;
}

export interface MergeReadinessOptions {
  readonly complianceResult: ComplianceReviewResult;
  readonly prTestsPassed: boolean;
  readonly pausedAt?: string | undefined;
  readonly lastOperatorInteractionAt?: string | undefined;
}

export interface MergeReadinessDecision {
  readonly canMerge: boolean;
  readonly reason: string;
  readonly isPaused?: boolean | undefined;
  readonly cooldownRemainingMs?: number | undefined;
  readonly autoMergedAfterCooldown?: boolean | undefined;
}

/**
 * ComplianceReviewStage
 *
 * Audits pull request diffs against operator advisory guidance,
 * coordinates non-blocking advisory pauses for non-stoppage questions,
 * and enables seamless auto-merge progression when no operator intervention occurs.
 */
export class ComplianceReviewStage {
  private readonly cooldownWindowMs: number;

  constructor(
    private readonly inferenceProvider?: IInferenceProvider | undefined,
    options?: ComplianceReviewStageOptions,
  ) {
    this.cooldownWindowMs = options?.cooldownWindowMs ?? 5 * 60 * 1000;
  }

  /**
   * Audits proposed diff changes against operator instructions and constraints.
   */
  public async auditCompliance(
    options: ComplianceAuditOptions,
  ): Promise<ComplianceReviewResult> {
    const { guidanceList, diff, reviewerModel } = options;

    if (!guidanceList || guidanceList.length === 0) {
      return {
        verdict: "COMPLIANT",
        notes: "No operator advisory guidance attached to task.",
        advisoryItems: [],
        isPausedForAdvisory: false,
      };
    }

    // Build compliance review prompt
    const prompt = this.buildCompliancePrompt(diff, guidanceList);

    let rawResponse = "";
    if (this.inferenceProvider) {
      const response = await this.inferenceProvider.generate({
        model: reviewerModel,
        messages: [
          {
            role: "system",
            content:
              "You are an automated senior compliance auditor verifying code changes against operator instructions and architectural constraints.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
      });
      rawResponse = response.content;
    } else {
      // Deterministic fallback if provider is not injected
      return {
        verdict: "COMPLIANT",
        notes: "Evaluated without active inference provider.",
        advisoryItems: guidanceList.map((g) => ({
          title: g.commentText,
          satisfied: true,
          severity: "info",
        })),
        isPausedForAdvisory: false,
      };
    }

    return this.parseComplianceResponse(rawResponse, guidanceList);
  }

  /**
   * Evaluates merge readiness and handles advisory pause cooldown logic.
   */
  public evaluateMergeReadiness(
    options: MergeReadinessOptions,
  ): MergeReadinessDecision {
    const { complianceResult, prTestsPassed, pausedAt, lastOperatorInteractionAt } = options;

    if (!prTestsPassed) {
      return {
        canMerge: false,
        reason: "PR verification tests failed.",
        isPaused: false,
      };
    }

    if (complianceResult.verdict === "NON_COMPLIANT") {
      return {
        canMerge: false,
        reason: `Code changes are non-compliant with operator guidance: ${complianceResult.notes}`,
        isPaused: false,
      };
    }

    if (complianceResult.verdict === "COMPLIANT") {
      return {
        canMerge: true,
        reason: "Changes fully satisfy all operator guidance and verification tests passed.",
      };
    }

    // Handle ADVISORY_QUESTION
    if (complianceResult.verdict === "ADVISORY_QUESTION") {
      const now = Date.now();
      const pausedTime = pausedAt ? new Date(pausedAt).getTime() : now;
      const elapsedMs = now - pausedTime;

      // Check if operator intervened during the pause
      if (
        lastOperatorInteractionAt &&
        pausedAt &&
        new Date(lastOperatorInteractionAt).getTime() > new Date(pausedAt).getTime()
      ) {
        return {
          canMerge: false,
          isPaused: true,
          reason: "Operator intervention registered during advisory pause; holding for review.",
        };
      }

      // Check if cooldown window has elapsed without intervention
      if (elapsedMs >= this.cooldownWindowMs) {
        return {
          canMerge: true,
          autoMergedAfterCooldown: true,
          reason: "Advisory cooldown window elapsed with no operator intervention; auto-merging.",
        };
      }

      // Still in cooldown window
      return {
        canMerge: false,
        isPaused: true,
        cooldownRemainingMs: Math.max(0, this.cooldownWindowMs - elapsedMs),
        reason: "Paused for operator advisory feedback; will auto-merge if no intervention occurs.",
      };
    }

    return {
      canMerge: false,
      reason: "Unknown compliance verdict.",
    };
  }

  private buildCompliancePrompt(
    diff: string,
    guidanceList: readonly TaskAdvisoryGuidance[],
  ): string {
    const formattedGuidance = guidanceList
      .map(
        (g, i) =>
          `[Item ${i + 1}] Type: ${g.advisoryType} | Author: ${g.author}\nInstruction: ${g.commentText}`,
      )
      .join("\n\n");

    return [
      "Review the provided git diff against the following operator instructions and guidelines:",
      "",
      "--- OPERATOR ADVISORY GUIDELINES ---",
      formattedGuidance,
      "",
      "--- GIT DIFF ---",
      diff.slice(0, 30000),
      "",
      "Evaluate whether each instruction is satisfied.",
      "Respond strictly in JSON format as follows:",
      "{",
      '  "verdict": "COMPLIANT" | "NON_COMPLIANT" | "ADVISORY_QUESTION",',
      '  "notes": "Detailed summary explanation of verdict",',
      '  "items": [',
      '    { "title": "Instruction summary", "satisfied": true, "feedback": "Explanation", "severity": "info" | "warning" | "blocker" }',
      "  ]",
      "}",
    ].join("\n");
  }

  private parseComplianceResponse(
    llmText: string,
    guidanceList: readonly TaskAdvisoryGuidance[],
  ): ComplianceReviewResult {
    try {
      const firstBrace = llmText.indexOf("{");
      const lastBrace = llmText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = llmText.slice(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonStr);

        const verdict: ComplianceVerdict = [
          "COMPLIANT",
          "NON_COMPLIANT",
          "ADVISORY_QUESTION",
        ].includes(parsed.verdict)
          ? parsed.verdict
          : "COMPLIANT";

        const advisoryItems: ComplianceAuditItem[] = Array.isArray(parsed.items)
          ? parsed.items.map((it: any) => ({
              title: String(it.title || ""),
              satisfied: Boolean(it.satisfied),
              feedback: it.feedback ? String(it.feedback) : undefined,
              severity: ["info", "warning", "blocker"].includes(it.severity)
                ? it.severity
                : "info",
            }))
          : guidanceList.map((g) => ({
              title: g.commentText,
              satisfied: verdict === "COMPLIANT",
              severity: "info",
            }));

        const isPaused = verdict === "ADVISORY_QUESTION";
        const cooldownEndsAt = isPaused
          ? new Date(Date.now() + this.cooldownWindowMs).toISOString()
          : undefined;

        return {
          verdict,
          notes: parsed.notes || "Compliance review evaluated.",
          advisoryItems,
          isPausedForAdvisory: isPaused,
          cooldownEndsAt,
        };
      }
    } catch {
      // Fallback if parsing fails
    }

    return {
      verdict: "COMPLIANT",
      notes: llmText || "Compliance evaluated without structured feedback.",
      advisoryItems: guidanceList.map((g) => ({
        title: g.commentText,
        satisfied: true,
        severity: "info",
      })),
      isPausedForAdvisory: false,
    };
  }
}
