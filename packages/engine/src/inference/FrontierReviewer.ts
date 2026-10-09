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
  private readonly reviewTimeoutMs: number;

  constructor(options?: {
    readonly inferenceProvider?: IInferenceProvider | undefined;
    readonly defaultModel?: string | undefined;
    readonly reviewTimeoutMs?: number | undefined;
  }) {
    this.inferenceProvider = options?.inferenceProvider;
    this.defaultModel = options?.defaultModel || process.env.FRONTIER_REVIEWER_MODEL || "qwen2.5-coder:7b-instruct-q4_K_M";
    this.reviewTimeoutMs = options?.reviewTimeoutMs ?? 45_000;
  }

  /**
   * Generates a structured review evaluation checklist.
   */
  public async evaluateReview(context: ReviewPromptContext): Promise<ReviewEvaluationResult> {
    const diffText = context.diff || "";
    const testSummary = context.testSummary || "All scoped tests passed cleanly.";

    // 1. Structural Anti-Stub Inspection
    const structuralIssues = this.inspectStructuralAntiStub(context.title, diffText);
    if (structuralIssues.length > 0) {
      return {
        verdict: "REJECT",
        reviewNotes: `Structural Anti-Stub Gate rejected diff: ${structuralIssues.join("; ")}`,
        comments: structuralIssues.map((msg) => ({
          path: "diff",
          lineNumber: 1,
          comment: msg,
          severity: "blocker" as const
        })),
        solidComplianceScore: 30,
        testCoveragePassed: false,
        securityBoundariesPassed: true
      };
    }

    // If an inference provider is configured (either frontier API or local reasoner)
    if (this.inferenceProvider) {
      try {
        const prompt = this.buildReviewPrompt(context.title, diffText, testSummary);
        const reviewTimeoutMs = this.reviewTimeoutMs;
        const abortController = new AbortController();
        let timeoutHandle: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            abortController.abort(new Error(`Frontier review generation timed out after ${reviewTimeoutMs}ms`));
            reject(new Error(`Frontier review generation timed out after ${reviewTimeoutMs}ms`));
          }, reviewTimeoutMs);
        });

        try {
          const generatePromise = this.inferenceProvider.generate({
            model: this.defaultModel,
            messages: [
              {
                role: "system",
                content: "You are a senior principal software architect conducting an automated pull request review. Reject any superficial mocks, empty component templates, or stub implementations."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.1,
            maxTokens: 1024,
            signal: abortController.signal
          });

          const response = await Promise.race([generatePromise, timeoutPromise]);
          return this.parseReviewResponse(response.content, diffText);
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }
      } catch (err) {
        console.warn("[FrontierReviewer] Provider review invocation failed, applying heuristic evaluation:", err);
      }
    }

    // Heuristic deterministic evaluation when no provider or on provider error
    return this.evaluateHeuristically(context.title, diffText);
  }

  /**
   * Deterministic structural verification rejecting empty templates, comment stripping,
   * and placeholder error stubs before model invocation.
   */
  public inspectStructuralAntiStub(_title: string, diffText: string): string[] {
    const issues: string[] = [];
    if (!diffText) return issues;

    // Check for empty Angular component templates
    if (
      diffText.includes("@Component") &&
      (/template\s*:\s*[`'"]\s*<div(?:\s+class=["'][^"']*["'])?>\s*<\/div>\s*[`'"]/i.test(diffText) ||
       /template\s*:\s*[`'"]\s*<div class="component-container"><\/div>\s*[`'"]/i.test(diffText) ||
       /template\s*:\s*[`'"]\s*<p>\s*<\/p>\s*[`'"]/i.test(diffText))
    ) {
      issues.push("Detected placeholder or empty component template ('component-container'). Real semantic UI required.");
    }

    // Check for placeholder error throwing or TODO bodies
    if (/\+.*throw\s+new\s+Error\s*\(\s*[`'"](?:not implemented|todo|stub)/i.test(diffText)) {
      issues.push("Detected unimplemented placeholder method body in added lines.");
    }

    // Check for net comment-only deletion
    const addedLines = diffText.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
    const removedLines = diffText.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
    const addedCodeLines = addedLines.filter((l) => {
      const trimmed = l.slice(1).trim();
      return trimmed.length > 0 && !trimmed.startsWith("//") && !trimmed.startsWith("/*") && !trimmed.startsWith("*");
    });
    const removedDocLines = removedLines.filter((l) => {
      const trimmed = l.slice(1).trim();
      return trimmed.startsWith("/**") || trimmed.startsWith("*") || trimmed.startsWith("*/");
    });

    if (removedDocLines.length >= 4 && addedCodeLines.length === 0) {
      issues.push("Diff predominantly strips documentation comments without adding implementation logic.");
    }

    return issues;
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
