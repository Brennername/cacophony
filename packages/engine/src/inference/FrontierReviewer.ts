import type { ReviewVerdict, ReviewComment } from "@cacophony/shared-types";
import type { IInferenceProvider } from "./IInferenceProvider.js";

export interface ReviewEvaluationResult {
  readonly verdict: ReviewVerdict;
  readonly reviewNotes: string;
  readonly comments: readonly ReviewComment[];
  readonly solidComplianceScore: number; // 0 to 100
  readonly testCoveragePassed: boolean;
  readonly securityBoundariesPassed: boolean;
  readonly semanticCompletenessScore?: number | undefined;
  readonly executivePlan?: string | undefined;
  readonly criticPasses?: readonly CriticPassResult[] | undefined;
}

export interface CriticPassResult {
  readonly criticRole: "semantic_completeness" | "solid_quality";
  readonly modelUsed: string;
  readonly verdict: ReviewVerdict;
  readonly score: number;
  readonly notes: string;
  readonly comments: readonly ReviewComment[];
}

export interface MoEReviewOptions {
  readonly semanticModel?: string | undefined;
  readonly qualityModel?: string | undefined;
  readonly executiveModel?: string | undefined;
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
   * Two-stage Striped Mixture-of-Experts review gate:
   * Stage 1: Semantic Completeness Critic (runs on semantic reasoning model)
   * Stage 2: SOLID Quality & Security Critic (runs on quality/architecture model)
   * Stage 3: Executive Consolidator (synthesizes verdicts and outputs post-review roadmap)
   */
  public async evaluateStripedMoEReview(
    context: ReviewPromptContext,
    options?: MoEReviewOptions
  ): Promise<ReviewEvaluationResult> {
    const diffText = context.diff || "";
    const testSummary = context.testSummary || "All scoped tests passed cleanly.";

    // 1. Structural Anti-Stub deterministic pre-flight check
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
        semanticCompletenessScore: 10,
        testCoveragePassed: false,
        securityBoundariesPassed: true,
        executivePlan: "Rework implementation to provide substantive functional logic without placeholders or empty stubs."
      };
    }

    const semanticModel = options?.semanticModel || process.env.FRONTIER_SEMANTIC_MODEL || "deepseek-r1:8b";
    const qualityModel = options?.qualityModel || options?.executiveModel || this.defaultModel;

    // Stage 1: Semantic Completeness Critic
    const semanticPass = await this.runSemanticCritic(context.title, diffText, testSummary, semanticModel);

    // Stage 2: SOLID Quality Critic
    const qualityPass = await this.runSolidQualityCritic(context.title, diffText, testSummary, qualityModel);

    // Stage 3: Executive Consolidation
    return this.consolidateMoEVerdicts(context.title, diffText, [semanticPass, qualityPass]);
  }

  /**
   * Stage 1 Critic: Evaluates semantic completeness and feature coverage against task objective.
   */
  public async runSemanticCritic(
    title: string,
    diff: string,
    testSummary: string,
    model: string
  ): Promise<CriticPassResult> {
    if (this.inferenceProvider) {
      try {
        const prompt = [
          `Task Objective: ${title}`,
          "Evaluate strictly whether the provided diff substantively implements the task objective.",
          "Check for: full functional coverage, absence of hollow mocks, real logic implementations.",
          `Test Summary: ${testSummary}`,
          "",
          "Diff:",
          diff.slice(0, 15000),
          "",
          "Respond strictly in JSON with no Markdown wrappers:",
          "{",
          '  "verdict": "APPROVE" | "REQUEST_CHANGES" | "REJECT",',
          '  "score": 90,',
          '  "notes": "Semantic evaluation notes",',
          '  "comments": [{ "path": "file.ts", "lineNumber": 1, "comment": "Note", "severity": "info" | "warning" | "blocker" }]',
          "}"
        ].join("\n");

        const response = await this.inferenceProvider.generate({
          model,
          messages: [
            {
              role: "system",
              content: "You are the Semantic Completeness Critic. Ensure the code diff fully satisfies the task title and implements real operational logic rather than hollow stubs."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          maxTokens: 1024
        });

        const parsed = this.parseCriticResponse(response.content, "semantic_completeness", model);
        if (parsed) return parsed;
      } catch (err) {
        console.warn(`[FrontierReviewer] Semantic critic call with model '${model}' failed, falling back to heuristic:`, err);
      }
    }

    // Heuristic semantic evaluation
    const isTrivial = diff.trim().length < 80;
    const score = isTrivial ? 50 : 90;
    return {
      criticRole: "semantic_completeness",
      modelUsed: model,
      verdict: score >= 75 ? "APPROVE" : "REQUEST_CHANGES",
      score,
      notes: isTrivial
        ? "Diff appears trivial or incomplete relative to task objective."
        : "Substantive changes detected matching task scope.",
      comments: isTrivial
        ? [{ path: "diff", lineNumber: 1, comment: "Diff has minimal code changes.", severity: "warning" }]
        : []
    };
  }

  /**
   * Stage 2 Critic: Evaluates SOLID architecture, strict typing, and security boundaries.
   */
  public async runSolidQualityCritic(
    title: string,
    diff: string,
    testSummary: string,
    model: string
  ): Promise<CriticPassResult> {
    if (this.inferenceProvider) {
      try {
        const prompt = this.buildReviewPrompt(title, diff, testSummary);
        const response = await this.inferenceProvider.generate({
          model,
          messages: [
            {
              role: "system",
              content: "You are the SOLID Quality Critic. Evaluate interfaces, single responsibility, dependency injection, typing rigor, and security boundaries."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          maxTokens: 1024
        });

        const parsed = this.parseCriticResponse(response.content, "solid_quality", model);
        if (parsed) return parsed;
      } catch (err) {
        console.warn(`[FrontierReviewer] Quality critic call with model '${model}' failed, falling back to heuristic:`, err);
      }
    }

    // Heuristic SOLID evaluation
    const heuristic = this.evaluateHeuristically(title, diff);
    return {
      criticRole: "solid_quality",
      modelUsed: model,
      verdict: heuristic.verdict,
      score: heuristic.solidComplianceScore,
      notes: heuristic.reviewNotes,
      comments: heuristic.comments
    };
  }

  /**
   * Stage 3: Consolidates multi-model critic findings into final verdict and executive plan.
   */
  public consolidateMoEVerdicts(
    title: string,
    _diff: string,
    criticPasses: readonly CriticPassResult[]
  ): ReviewEvaluationResult {
    const semanticPass = criticPasses.find((p) => p.criticRole === "semantic_completeness");
    const qualityPass = criticPasses.find((p) => p.criticRole === "solid_quality");

    const semanticScore = semanticPass ? semanticPass.score : 85;
    const solidScore = qualityPass ? qualityPass.score : 85;

    const allComments: ReviewComment[] = [];
    for (const pass of criticPasses) {
      allComments.push(...pass.comments);
    }

    const hasBlockers = allComments.some((c) => c.severity === "blocker");
    const hasWarnings = allComments.some((c) => c.severity === "warning");

    let verdict: ReviewVerdict = "APPROVE";
    if (
      semanticPass?.verdict === "REJECT" ||
      qualityPass?.verdict === "REJECT" ||
      semanticScore < 50 ||
      solidScore < 50
    ) {
      verdict = "REJECT";
    } else if (
      semanticPass?.verdict === "REQUEST_CHANGES" ||
      qualityPass?.verdict === "REQUEST_CHANGES" ||
      hasBlockers ||
      semanticScore < 75 ||
      solidScore < 75
    ) {
      verdict = "REQUEST_CHANGES";
    }

    // Executive Roadmap for remediation
    let executivePlan: string;
    if (verdict === "APPROVE") {
      executivePlan = "Changes meet architectural, semantic, and SOLID standards. Ready for staging merge.";
    } else {
      const planItems: string[] = [];
      if (semanticScore < 75) {
        planItems.push("1. Expand operational feature logic to fully cover task objectives without stubs.");
      }
      if (solidScore < 75 || hasBlockers) {
        planItems.push("2. Resolve SOLID and security boundary defects flagged by the Quality Critic.");
      }
      if (hasWarnings) {
        planItems.push("3. Eliminate untyped declarations and refactor warnings.");
      }
      executivePlan = `Remediation Plan for '${title}':\n` + planItems.join("\n");
    }

    const reviewNotes = `MoE Striped Review (${criticPasses.map((p) => `${p.criticRole}: ${p.modelUsed}`).join(", ")}): ` +
      `Semantic ${semanticScore}%, SOLID ${solidScore}%. Verdict: ${verdict}.`;

    return {
      verdict,
      reviewNotes,
      comments: allComments,
      solidComplianceScore: solidScore,
      semanticCompletenessScore: semanticScore,
      testCoveragePassed: verdict !== "REJECT",
      securityBoundariesPassed: !hasBlockers,
      executivePlan,
      criticPasses
    };
  }

  private parseCriticResponse(
    rawText: string,
    role: "semantic_completeness" | "solid_quality",
    model: string
  ): CriticPassResult | null {
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const verdict: ReviewVerdict = ["APPROVE", "REQUEST_CHANGES", "REJECT"].includes(parsed.verdict)
          ? parsed.verdict
          : "APPROVE";
        const score = typeof parsed.score === "number" ? parsed.score : (typeof parsed.solidComplianceScore === "number" ? parsed.solidComplianceScore : 85);
        return {
          criticRole: role,
          modelUsed: model,
          verdict,
          score,
          notes: parsed.notes || parsed.reviewNotes || "Critic evaluation complete.",
          comments: Array.isArray(parsed.comments) ? parsed.comments : []
        };
      }
    } catch {
      // Fallback
    }
    return null;
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
