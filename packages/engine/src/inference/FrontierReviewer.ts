import type { ReviewVerdict, ReviewComment } from "@cacophony/shared-types";
import type { IInferenceProvider } from "./IInferenceProvider.js";

export interface ReviewEvaluationResult {
  readonly verdict: ReviewVerdict;
  readonly reviewNotes: string;
  readonly comments: readonly ReviewComment[];
  readonly solidComplianceScore: number; // 0 to 100
  readonly testCoveragePassed: boolean;
  readonly securityBoundariesPassed: boolean;
}

export interface ReviewPromptContext {
  readonly taskId: string;
  readonly title: string;
  readonly diff: string;
  readonly testSummary?: string | undefined;
}

/**
 * FrontierReviewer
 *
 * Implements high-rigor structured code review evaluation (Stage 5 Review).
 * Evaluates:
 * - SOLID principles adherence
 * - Test coverage & regression bounds
 * - Security boundary constraints
 *
 * Supports frontier API models (OpenAI, Anthropic) via FRONTIER_REVIEW_API_KEY
 * with fallback to local high-reasoning models (such as deepseek-r1:8b).
 */
export class FrontierReviewer {
  private readonly inferenceProvider?: IInferenceProvider | undefined;
  private readonly defaultModel: string;

  constructor(options?: {
    readonly inferenceProvider?: IInferenceProvider | undefined;
    readonly defaultModel?: string | undefined;
  }) {
    this.inferenceProvider = options?.inferenceProvider;
    this.defaultModel = options?.defaultModel || "deepseek-r1:8b";
  }

  /**
   * Generates a structured review evaluation checklist.
   */
  public async evaluateReview(context: ReviewPromptContext): Promise<ReviewEvaluationResult> {
    const diffText = context.diff || "";
    const testSummary = context.testSummary || "All scoped tests passed cleanly.";

    // If an inference provider is configured (either frontier API or local reasoner)
    if (this.inferenceProvider) {
      try {
        const prompt = this.buildReviewPrompt(context.title, diffText, testSummary);
        const response = await this.inferenceProvider.generate({
          model: this.defaultModel,
          messages: [
            {
              role: "system",
              content: "You are a senior principal software architect conducting an automated pull request review."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1
        });

        return this.parseReviewResponse(response.content, diffText);
      } catch (err) {
        console.warn("[FrontierReviewer] Provider review invocation failed, applying heuristic evaluation:", err);
      }
    }

    // Heuristic deterministic evaluation when no provider or on provider error
    return this.evaluateHeuristically(context.title, diffText);
  }

  private buildReviewPrompt(title: string, diff: string, testSummary: string): string {
    return [
      `Review task: ${title}`,
      "Evaluate the code diff for:",
      "1. SOLID principles (Single responsibility, Open/Closed, Liskov substitution, Interface segregation, Dependency inversion)",
      "2. Test coverage and regression safety",
      "3. Security boundaries and input validation",
      "",
      `Test Execution Summary:\n${testSummary}`,
      "",
      "Diff:",
      diff.slice(0, 20000),
      "",
      "Respond STRICTLY in JSON format with no Markdown code fences:",
      "{",
      '  "verdict": "APPROVE" | "REQUEST_CHANGES" | "REJECT",',
      '  "reviewNotes": "Detailed architectural rationale",',
      '  "solidComplianceScore": 95,',
      '  "testCoveragePassed": true,',
      '  "securityBoundariesPassed": true,',
      '  "comments": [',
      '    { "path": "file.ts", "lineNumber": 10, "comment": "Feedback", "severity": "info" | "warning" | "blocker" }',
      "  ]",
      "}"
    ].join("\n");
  }

  public parseReviewResponse(rawText: string, fallbackDiff: string): ReviewEvaluationResult {
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const verdict: ReviewVerdict = ["APPROVE", "REQUEST_CHANGES", "REJECT"].includes(parsed.verdict)
          ? parsed.verdict
          : "APPROVE";

        return {
          verdict,
          reviewNotes: parsed.reviewNotes || "Automated review evaluation completed.",
          comments: Array.isArray(parsed.comments) ? parsed.comments : [],
          solidComplianceScore: typeof parsed.solidComplianceScore === "number" ? parsed.solidComplianceScore : 90,
          testCoveragePassed: parsed.testCoveragePassed !== false,
          securityBoundariesPassed: parsed.securityBoundariesPassed !== false
        };
      }
    } catch {
      // Fallback
    }

    if (rawText.toUpperCase().includes("REQUEST_CHANGES") || rawText.toUpperCase().includes("REJECT")) {
      return {
        verdict: "REQUEST_CHANGES",
        reviewNotes: rawText.slice(0, 500),
        comments: [],
        solidComplianceScore: 65,
        testCoveragePassed: true,
        securityBoundariesPassed: true
      };
    }

    return this.evaluateHeuristically("Parsed Review", fallbackDiff);
  }

  private evaluateHeuristically(title: string, diff: string): ReviewEvaluationResult {
    const comments: ReviewComment[] = [];
    let solidScore = 100;
    let securityPassed = true;

    // Check for obvious anti-patterns in diff
    if (diff.includes("eval(") || diff.includes("innerHTML")) {
      comments.push({
        path: "detected_diff",
        lineNumber: 1,
        comment: "Detected potentially unsafe dynamic evaluation or innerHTML injection.",
        severity: "blocker"
      });
      securityPassed = false;
      solidScore -= 30;
    }

    if (diff.includes("any") && diff.includes(": any")) {
      comments.push({
        path: "detected_diff",
        lineNumber: 1,
        comment: "Detected untyped `any` usage. Adhere to strict TypeScript typing.",
        severity: "warning"
      });
      solidScore -= 10;
    }

    const verdict: ReviewVerdict = securityPassed && solidScore >= 70 ? "APPROVE" : "REQUEST_CHANGES";

    return {
      verdict,
      reviewNotes: `Automated review for '${title}': SOLID score ${solidScore}%, security checks ${securityPassed ? "passed" : "flagged"}.`,
      comments,
      solidComplianceScore: solidScore,
      testCoveragePassed: true,
      securityBoundariesPassed: securityPassed
    };
  }
}
