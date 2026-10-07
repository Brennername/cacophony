import type { IncidentBundle, GitCommitRecord } from "./IncidentBundleRecorder.js";
import type { OllamaProvider } from "../inference/OllamaProvider.js";

export interface SuspectCommit {
  readonly hash: string;
  readonly message: string;
  readonly reason: string;
  readonly confidence: number;
}

export interface RegressionAnalysisResult {
  readonly bundleId: string;
  readonly classification: "ENGINE_REGRESSION" | "MODEL_CAPACITY" | "ENVIRONMENT";
  readonly confidence: number;
  readonly suspectCommits: readonly SuspectCommit[];
  readonly recommendedAction: "GIT_BISECT" | "MODEL_SWAP" | "RULE_SYNTHESIS" | "RETRY_WITH_HIGHER_CONTEXT";
  readonly explanation: string;
  readonly bisectStartCommit?: string | undefined;
  readonly bisectEndCommit?: string | undefined;
}

export interface FrontierRegressionAnalyzerOptions {
  readonly inferenceProvider?: OllamaProvider | undefined;
  readonly frontierModel?: string | undefined;
}

export class FrontierRegressionAnalyzer {
  private readonly provider?: OllamaProvider | undefined;
  private readonly frontierModel: string;

  constructor(options: FrontierRegressionAnalyzerOptions = {}) {
    this.provider = options.inferenceProvider;
    this.frontierModel = options.frontierModel ?? "deepseek-r1:8b";
  }

  /**
   * Analyzes an incident bundle to determine root-cause category and suspect commits.
   */
  public async analyze(bundle: IncidentBundle): Promise<RegressionAnalysisResult> {
    const errorSummaries = bundle.failingTasks
      .map((t) => `Task ${t.taskId} (${t.modelId}): ${t.errorDetails || "Unknown error"}`)
      .join("\n");

    const commitList = bundle.gitCommits
      .map((c) => `${c.hash.slice(0, 8)}: ${c.message}`)
      .join("\n");

    // If frontier provider is available, query model for deep critique
    if (this.provider) {
      try {
        const prompt = `You are a site reliability and compiler regression analysis expert.
Analyze this incident bundle:
Failing Tasks:
${errorSummaries}

Recent Git Commits:
${commitList}

Output valid JSON matching this schema:
{
  "classification": "ENGINE_REGRESSION" | "MODEL_CAPACITY" | "ENVIRONMENT",
  "confidence": number between 0 and 1,
  "suspectCommitHashes": string[],
  "explanation": string,
  "recommendedAction": "GIT_BISECT" | "MODEL_SWAP" | "RULE_SYNTHESIS"
}`;

        const response = await this.provider.generate({
          model: this.frontierModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
        });

        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const suspectCommits = this.matchSuspectCommits(
            parsed.suspectCommitHashes || [],
            bundle.gitCommits,
            parsed.explanation || "Identified by frontier analyzer"
          );

          return {
            bundleId: bundle.bundleId,
            classification: parsed.classification || "ENGINE_REGRESSION",
            confidence: parsed.confidence || 0.8,
            suspectCommits,
            recommendedAction: parsed.recommendedAction || "GIT_BISECT",
            explanation: parsed.explanation || "Frontier model diagnosed systemic regression",
            bisectStartCommit: suspectCommits[0]?.hash,
            bisectEndCommit: bundle.gitCommits[bundle.gitCommits.length - 1]?.hash,
          };
        }
      } catch {
        // Fall back to heuristic rule-based analyzer
      }
    }

    return this.analyzeWithHeuristics(bundle);
  }

  /**
   * Rule-based heuristic analyzer identifying suspect commits from error patterns.
   */
  public analyzeWithHeuristics(bundle: IncidentBundle): RegressionAnalysisResult {
    const failingTasks = bundle.failingTasks;
    const errorsJoined = failingTasks.map((t) => t.errorDetails || "").join(" ").toLowerCase();

    const isTypeMismatch = errorsJoined.includes("ts2339") || errorsJoined.includes("property") || errorsJoined.includes("not found");
    const isTimeout = errorsJoined.includes("timeout") || errorsJoined.includes("exceeded allocated timeout");

    let classification: "ENGINE_REGRESSION" | "MODEL_CAPACITY" | "ENVIRONMENT" = "ENGINE_REGRESSION";
    let recommendedAction: "GIT_BISECT" | "MODEL_SWAP" | "RULE_SYNTHESIS" | "RETRY_WITH_HIGHER_CONTEXT" = "GIT_BISECT";
    const suspectCommits: SuspectCommit[] = [];

    if (isTimeout) {
      classification = "ENVIRONMENT";
      recommendedAction = "MODEL_SWAP";
    } else if (isTypeMismatch) {
      classification = "ENGINE_REGRESSION";
      recommendedAction = "GIT_BISECT";

      // Match recent commit altering interface or engine components
      for (const commit of bundle.gitCommits.slice(0, 5)) {
        const msg = commit.message.toLowerCase();
        if (msg.includes("refactor") || msg.includes("interface") || msg.includes("fix(") || msg.includes("feat(")) {
          suspectCommits.push({
            hash: commit.hash,
            message: commit.message,
            reason: `Modified core engine structures shortly before failure cluster (${commit.message})`,
            confidence: 0.85,
          });
        }
      }
    } else {
      classification = "MODEL_CAPACITY";
      recommendedAction = "RULE_SYNTHESIS";
    }

    const explanation = `Heuristic evaluation classified incident as ${classification}. High multi-model failure density across ${bundle.alert.distinctModels.join(", ")}.`;

    return {
      bundleId: bundle.bundleId,
      classification,
      confidence: 0.75,
      suspectCommits,
      recommendedAction,
      explanation,
      bisectStartCommit: suspectCommits[0]?.hash || bundle.gitCommits[0]?.hash,
      bisectEndCommit: bundle.gitCommits[bundle.gitCommits.length - 1]?.hash,
    };
  }

  /**
   * Generates a reproducible git bisect script string.
   */
  public generateBisectScript(result: RegressionAnalysisResult): string {
    const bad = result.bisectStartCommit ? result.bisectStartCommit.slice(0, 8) : "HEAD";
    const good = result.bisectEndCommit ? result.bisectEndCommit.slice(0, 8) : "HEAD~10";

    return `#!/usr/bin/env bash
# Automated Git Bisect Script for Incident ${result.bundleId}
set -euo pipefail

echo "Starting automated git bisect for suspected regression..."
git bisect start
git bisect bad ${bad}
git bisect good ${good}

# Run engine verification test suite
git bisect run npm test --workspace=@cacophony/engine

echo "Bisect run complete."
`;
  }

  private matchSuspectCommits(
    hashes: string[],
    commits: readonly GitCommitRecord[],
    reason: string
  ): SuspectCommit[] {
    const matched: SuspectCommit[] = [];
    for (const h of hashes) {
      const match = commits.find((c) => c.hash.startsWith(h) || h.startsWith(c.hash.slice(0, 8)));
      if (match) {
        matched.push({
          hash: match.hash,
          message: match.message,
          reason,
          confidence: 0.9,
        });
      }
    }
    return matched;
  }
}
