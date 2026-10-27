import type { IInferenceProvider } from "./IInferenceProvider.js";
import { extractJsonObjectString } from "../utils/json_utils.js";

export type ExpertDomain = "implementation" | "security" | "dx_ux" | "architecture" | string;

export type ExpertRiskSeverity = "low" | "medium" | "high" | "critical";

export interface ExpertRisk {
  readonly severity: ExpertRiskSeverity;
  readonly message: string;
  readonly location?: {
    readonly path?: string;
    readonly line?: number;
  };
}

export interface ExpertRemediation {
  readonly priority: ExpertRiskSeverity;
  readonly description: string;
  readonly proposedFix?: string;
}

export interface ExpertScorecard {
  readonly domain: ExpertDomain;
  readonly expertName: string;
  readonly modelUsed: string;
  readonly score: number; // 0 to 100
  readonly verdict: "APPROVE" | "REQUEST_CHANGES" | "WARN";
  readonly summary: string;
  readonly shoutVolume: number; // 0.0 to 1.0 (urgency/intensity of the expert's shout)
  readonly identifiedRisks: readonly ExpertRisk[];
  readonly recommendedRemediations: readonly ExpertRemediation[];
  readonly durationMs: number;
}

export interface PandemoniumFeedback {
  readonly scorecards: readonly ExpertScorecard[];
  readonly compositeVerdict: "APPROVE" | "REQUEST_CHANGES" | "SPLIT_DECISION";
  readonly conflictingSignals: readonly string[];
  readonly topDissentingConcerns: readonly string[];
  readonly domainScores: Readonly<Record<string, number>>;
  readonly highestRiskSeverity: ExpertRiskSeverity | "none";
  readonly totalDurationMs: number;
}

export interface TableOfExpertsEvaluationContext {
  readonly taskId: string;
  readonly taskTitle: string;
  readonly diff: string;
  readonly focusFiles?: string | null | undefined;
  readonly testOutput?: string | undefined;
}

export interface TableOfExpertsCoordinatorOptions {
  readonly inferenceProvider: IInferenceProvider;
  readonly expertModels?: Partial<Record<ExpertDomain, string>>;
  readonly defaultModel?: string;
  readonly fallbackModel?: string;
  readonly timeoutMs?: number;
}

interface ExpertDefinition {
  readonly domain: ExpertDomain;
  readonly expertName: string;
  readonly envVarKey: string;
  readonly defaultModel: string;
  readonly systemPrompt: string;
}

/**
 * TableOfExpertsCoordinator
 *
 * Implements Phase S5 (T-S5.2):
 * A decentralized Table of Experts architecture adhering to the Oliver Selfridge Pandemonium paradigm.
 * Experts shout independently from their specialized domain perspectives:
 * - Implementation Specialist: Algorithmic correctness, edge cases, error recovery, bounds checking.
 * - Security/Vulnerability Auditor: Injections, traversal, secrets, prototype pollution, ReDoS.
 * - DX/UX Usability Critic: Mobile-first responsive layouts, a11y, themes, API ergonomics, zero emojis.
 * - Architecture & SOLID Auditor: SOLID principles, loose coupling, strict typing, mock elimination.
 *
 * Conflicting perspectives are preserved as first-class domain feedback and not averaged away.
 */
export class TableOfExpertsCoordinator {
  private readonly inferenceProvider: IInferenceProvider;
  private readonly expertModels: Partial<Record<ExpertDomain, string>>;
  private readonly defaultModel: string;
  private readonly fallbackModel: string;
  private readonly timeoutMs: number;

  constructor(options: TableOfExpertsCoordinatorOptions) {
    this.inferenceProvider = options.inferenceProvider;
    this.expertModels = options.expertModels ?? {};
    this.defaultModel =
      options.defaultModel ||
      process.env.DEFAULT_REVIEWER_MODEL ||
      process.env.DEFAULT_REASONING_MODEL ||
      "deepseek-coder-v2:16b";
    this.fallbackModel =
      options.fallbackModel ||
      process.env.FALLBACK_REVIEWER_MODEL ||
      "qwen2.5-coder:7b-instruct-q4_K_M";
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  /**
   * Returns list of configured expert definitions.
   */
  public getExpertDefinitions(): readonly ExpertDefinition[] {
    return [
      {
        domain: "implementation",
        expertName: "Implementation Specialist",
        envVarKey: "EXPERT_IMPLEMENTATION_MODEL",
        defaultModel: this.defaultModel,
        systemPrompt: [
          "You are an Implementation Specialist assessing code changes.",
          "Your mission is to evaluate algorithm accuracy, boundary and off-by-one edge cases, error handling,",
          "type safety, input sanitization, and runtime efficiency.",
          "Shout with high urgency if logic errors, missing bounds checks, or uncaught exceptions are found.",
          "Never output emojis in any part of your review. Output valid JSON.",
        ].join(" "),
      },
      {
        domain: "security",
        expertName: "Security/Vulnerability Auditor",
        envVarKey: "EXPERT_SECURITY_MODEL",
        defaultModel: this.defaultModel,
        systemPrompt: [
          "You are a Security and Vulnerability Auditor conducting deep penetration and vulnerability analysis.",
          "Your mission is to inspect the code diff for command injections, shell escaping flaws, path traversal,",
          "prototype pollution, secret/credential leaks, ReDoS regular expression vulnerabilities, and unsafe deserialization.",
          "Shout with maximum volume (critical urgency) if any security flaw or bypass is detected.",
          "Never output emojis in any part of your review. Output valid JSON.",
        ].join(" "),
      },
      {
        domain: "dx_ux",
        expertName: "DX/UX Usability Critic",
        envVarKey: "EXPERT_DX_UX_MODEL",
        defaultModel: this.fallbackModel,
        systemPrompt: [
          "You are a Lead DX / UX Usability Critic inspecting interface and API design.",
          "Your mission is to evaluate mobile-first responsiveness, accessibility (a11y) semantic HTML, ARIA tags,",
          "color theme contrast (dark and light modes), API ergonomics, and strict zero-emoji compliance.",
          "Shout if UI elements violate mobile-first principles or create nested scrolling traps.",
          "Never output emojis in any part of your review. Output valid JSON.",
        ].join(" "),
      },
      {
        domain: "architecture",
        expertName: "Architecture & SOLID Auditor",
        envVarKey: "EXPERT_ARCHITECTURE_MODEL",
        defaultModel: this.defaultModel,
        systemPrompt: [
          "You are a Principal Software Architect verifying structural integrity.",
          "Your mission is to inspect code for strict SOLID adherence (Single Responsibility, Open/Closed,",
          "Liskov Substitution, Interface Segregation, Dependency Inversion), loose coupling, shaped and typed data,",
          "and elimination of quick mock stubs in production paths.",
          "Shout if god objects, tight coupling, or un-migrated mock data are discovered.",
          "Never output emojis in any part of your review. Output valid JSON.",
        ].join(" "),
      },
    ];
  }

  /**
   * Resolves the model to invoke for a given expert domain.
   */
  public resolveModelForDomain(domain: ExpertDomain, defaultFallback: string): string {
    if (this.expertModels[domain]) {
      return this.expertModels[domain]!;
    }

    const envMap: Record<string, string | undefined> = {
      implementation: process.env.EXPERT_IMPLEMENTATION_MODEL,
      security: process.env.EXPERT_SECURITY_MODEL,
      dx_ux: process.env.EXPERT_DX_UX_MODEL,
      architecture: process.env.EXPERT_ARCHITECTURE_MODEL,
    };

    return envMap[domain] || defaultFallback;
  }

  /**
   * Coordinates the Table of Experts review. Each expert assesses the code independently
   * and shouts their domain perspective. Signals are preserved without flattening consensus.
   */
  public async evaluateDiff(
    context: TableOfExpertsEvaluationContext,
  ): Promise<PandemoniumFeedback> {
    const startTime = Date.now();
    const expertDefs = this.getExpertDefinitions();
    const scorecards: ExpertScorecard[] = [];

    // Run experts independently
    for (const def of expertDefs) {
      const expertStart = Date.now();
      const model = this.resolveModelForDomain(def.domain, def.defaultModel);
      const scorecard = await this.invokeExpert(def, model, context, expertStart);
      scorecards.push(scorecard);
    }

    const totalDurationMs = Date.now() - startTime;
    return this.synthesizePandemonium(scorecards, totalDurationMs);
  }

  /**
   * Invokes an individual expert with timeout and fallback handling.
   */
  private async invokeExpert(
    def: ExpertDefinition,
    model: string,
    context: TableOfExpertsEvaluationContext,
    expertStart: number,
  ): Promise<ExpertScorecard> {
    const userPrompt = [
      `Task: ${context.taskTitle} (${context.taskId})`,
      context.focusFiles ? `Focus Files: ${context.focusFiles}` : "",
      "Diff to Inspect:",
      "```diff",
      context.diff.slice(0, 6000),
      "```",
      context.testOutput
        ? `Test Output:\n\`\`\`text\n${context.testOutput.slice(0, 2000)}\n\`\`\``
        : "",
      "",
      "Respond strictly with a valid JSON object matching this schema:",
      "{",
      '  "score": number (0 to 100),',
      '  "verdict": "APPROVE" | "REQUEST_CHANGES" | "WARN",',
      '  "summary": "concise domain summary",',
      '  "shoutVolume": number (0.0 to 1.0 representing urgency),',
      '  "identifiedRisks": [',
      '    { "severity": "low" | "medium" | "high" | "critical", "message": "detail", "location": { "path": "file", "line": 10 } }',
      "  ],",
      '  "recommendedRemediations": [',
      '    { "priority": "low" | "medium" | "high" | "critical", "description": "detail", "proposedFix": "code" }',
      "  ]",
      "}",
    ]
      .filter((line) => line !== "")
      .join("\n");

    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const response = await this.inferenceProvider.generate({
        model,
        messages: [
          { role: "system", content: def.systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        signal: abortController.signal,
      });

      return this.parseExpertScorecard(def, model, response.content, Date.now() - expertStart);
    } catch (err) {
      // Fallback scorecard when inference fails or times out
      const durationMs = Date.now() - expertStart;
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        domain: def.domain,
        expertName: def.expertName,
        modelUsed: model,
        score: 75,
        verdict: "WARN",
        summary: `Automated fallback for ${def.expertName}: evaluation timed out or encountered error (${errorMessage}).`,
        shoutVolume: 0.3,
        identifiedRisks: [
          {
            severity: "low",
            message: `Evaluation fallback triggered due to provider failure: ${errorMessage}`,
          },
        ],
        recommendedRemediations: [],
        durationMs,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Parses model response into structured ExpertScorecard.
   */
  public parseExpertScorecard(
    def: ExpertDefinition,
    model: string,
    rawContent: string,
    durationMs: number,
  ): ExpertScorecard {
    try {
      const jsonStr = extractJsonObjectString(rawContent);
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        const score = typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 80;
        const verdict =
          parsed.verdict === "REQUEST_CHANGES" || parsed.verdict === "WARN" || parsed.verdict === "APPROVE"
            ? parsed.verdict
            : score < 70
              ? "REQUEST_CHANGES"
              : "APPROVE";

        const summary = typeof parsed.summary === "string" ? parsed.summary : "Domain inspection completed.";
        const parsedRisks: ExpertRisk[] = Array.isArray(parsed.identifiedRisks)
          ? parsed.identifiedRisks.map((r: any) => ({
              severity: this.normalizeSeverity(r.severity),
              message: typeof r.message === "string" ? r.message : "Unspecified risk noted",
              location: r.location && typeof r.location === "object"
                ? {
                    path: typeof r.location.path === "string" ? r.location.path : undefined,
                    line: typeof r.location.line === "number" ? r.location.line : undefined,
                  }
                : undefined,
            }))
          : [];

        const parsedRemediations: ExpertRemediation[] = Array.isArray(parsed.recommendedRemediations)
          ? parsed.recommendedRemediations.map((m: any) => ({
              priority: this.normalizeSeverity(m.priority),
              description: typeof m.description === "string" ? m.description : "Review recommended",
              proposedFix: typeof m.proposedFix === "string" ? m.proposedFix : undefined,
            }))
          : [];

        let shoutVolume = typeof parsed.shoutVolume === "number" ? Math.min(1.0, Math.max(0.0, parsed.shoutVolume)) : 0.5;
        if (parsedRisks.some((r) => r.severity === "critical")) {
          shoutVolume = 1.0;
        } else if (parsedRisks.some((r) => r.severity === "high") || verdict === "REQUEST_CHANGES") {
          shoutVolume = Math.max(shoutVolume, 0.8);
        }

        return {
          domain: def.domain,
          expertName: def.expertName,
          modelUsed: model,
          score,
          verdict,
          summary,
          shoutVolume,
          identifiedRisks: parsedRisks,
          recommendedRemediations: parsedRemediations,
          durationMs,
        };
      }
    } catch {
      // Fall through to text heuristic
    }

    // Text heuristic parsing
    const isRejection =
      rawContent.includes("REQUEST_CHANGES") ||
      rawContent.includes("VULNERABILITY") ||
      rawContent.includes("CRITICAL");

    const score = isRejection ? 45 : 80;
    const verdict = isRejection ? "REQUEST_CHANGES" : "APPROVE";
    const shoutVolume = isRejection ? 0.9 : 0.3;

    return {
      domain: def.domain,
      expertName: def.expertName,
      modelUsed: model,
      score,
      verdict,
      summary: rawContent.slice(0, 200).replace(/\n/g, " "),
      shoutVolume,
      identifiedRisks: isRejection
        ? [
            {
              severity: "high",
              message: "Text scan detected rejection keyword in expert commentary",
            },
          ]
        : [],
      recommendedRemediations: [],
      durationMs,
    };
  }

  /**
   * Synthesizes Pandemonium feedback, detecting conflicting signals, top dissenting concerns,
   * and highest risk severity while maintaining domain diversity.
   */
  public synthesizePandemonium(
    scorecards: readonly ExpertScorecard[],
    totalDurationMs: number,
  ): PandemoniumFeedback {
    const domainScores: Record<string, number> = {};
    const conflictingSignals: string[] = [];
    const topDissentingConcerns: string[] = [];
    let hasCriticalRisk = false;
    let hasHighRisk = false;
    let hasMediumRisk = false;
    let hasLowRisk = false;
    let hasRequestChanges = false;
    let hasApprove = false;

    for (const sc of scorecards) {
      domainScores[sc.domain] = sc.score;
      if (sc.verdict === "REQUEST_CHANGES") {
        hasRequestChanges = true;
      }
      if (sc.verdict === "APPROVE") {
        hasApprove = true;
      }

      for (const risk of sc.identifiedRisks) {
        if (risk.severity === "critical") hasCriticalRisk = true;
        if (risk.severity === "high") hasHighRisk = true;
        if (risk.severity === "medium") hasMediumRisk = true;
        if (risk.severity === "low") hasLowRisk = true;
      }

      // Add top concerns for loud or dissenting scorecards
      if (sc.shoutVolume >= 0.7 || sc.verdict === "REQUEST_CHANGES") {
        for (const risk of sc.identifiedRisks) {
          topDissentingConcerns.push(`[${sc.expertName}] (${risk.severity.toUpperCase()}): ${risk.message}`);
        }
        if (sc.identifiedRisks.length === 0) {
          topDissentingConcerns.push(`[${sc.expertName}]: ${sc.summary}`);
        }
      }
    }

    // Detect conflicting signals across domains
    const approving = scorecards.filter((s) => s.verdict === "APPROVE" && s.score >= 75);
    const rejecting = scorecards.filter((s) => s.verdict === "REQUEST_CHANGES" || s.score < 60);

    if (approving.length > 0 && rejecting.length > 0) {
      for (const rej of rejecting) {
        for (const app of approving) {
          conflictingSignals.push(
            `Divergence: ${rej.expertName} shouted ${rej.verdict} (Score: ${rej.score}, Vol: ${rej.shoutVolume.toFixed(1)}) while ${app.expertName} reported ${app.verdict} (Score: ${app.score}).`,
          );
        }
      }
    }

    // Determine highest risk severity
    const highestRiskSeverity: ExpertRiskSeverity | "none" = hasCriticalRisk
      ? "critical"
      : hasHighRisk
        ? "high"
        : hasMediumRisk
          ? "medium"
          : hasLowRisk
            ? "low"
            : "none";

    // Determine composite verdict:
    // If critical risk or explicit rejections exist, REQUEST_CHANGES.
    // If there is significant conflict between approving and rejecting experts without critical blockers, SPLIT_DECISION.
    // Otherwise APPROVE.
    let compositeVerdict: "APPROVE" | "REQUEST_CHANGES" | "SPLIT_DECISION";
    if (hasCriticalRisk) {
      compositeVerdict = "REQUEST_CHANGES";
    } else if (hasRequestChanges && !hasApprove) {
      compositeVerdict = "REQUEST_CHANGES";
    } else if (hasRequestChanges && hasApprove) {
      compositeVerdict = conflictingSignals.length > 0 ? "SPLIT_DECISION" : "REQUEST_CHANGES";
    } else {
      compositeVerdict = "APPROVE";
    }

    return {
      scorecards,
      compositeVerdict,
      conflictingSignals,
      topDissentingConcerns,
      domainScores,
      highestRiskSeverity,
      totalDurationMs,
    };
  }

  private normalizeSeverity(input: unknown): ExpertRiskSeverity {
    if (input === "critical") return "critical";
    if (input === "high") return "high";
    if (input === "medium") return "medium";
    return "low";
  }
}
