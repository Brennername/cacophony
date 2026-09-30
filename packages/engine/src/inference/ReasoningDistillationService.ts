import type { IInferenceProvider } from "./IInferenceProvider.js";

export interface ModelOpinionRecord {
  readonly summary: string;
  readonly keyDecisions: readonly string[];
  readonly identifiedRisks: readonly string[];
  readonly confidenceScore: number;
}

/**
 * ReasoningDistillationService
 *
 * Distills raw and verbose <think>...</think> cognitive traces from reasoning models
 * into structured architectural opinions (summary, key decisions, risks, and confidence scores).
 * Uses a lightweight, fast summarization prompt or robust regex heuristics if inference is offline.
 */
export class ReasoningDistillationService {
  private readonly provider?: IInferenceProvider | undefined;

  constructor(provider?: IInferenceProvider) {
    this.provider = provider;
  }

  /**
   * Distills a raw reasoning transcript string into a structured ModelOpinionRecord.
   *
   * @param rawTranscript Raw content inside <think> tags
   * @param model Model tag to use for distillation if inference provider is available
   */
  public async distillOpinion(rawTranscript: string, model = "qwen2.5-coder:7b-instruct-q4_K_M"): Promise<ModelOpinionRecord> {
    const trimmed = rawTranscript.trim();
    if (!trimmed) {
      return {
        summary: "No cognitive reasoning trace recorded.",
        keyDecisions: [],
        identifiedRisks: [],
        confidenceScore: 0.5
      };
    }

    if (this.provider) {
      try {
        const prompt = `You are an expert software architect evaluating an AI model's internal thinking trace.
Analyze this reasoning transcript and extract:
1. A concise 1-2 sentence executive summary of the approach.
2. 2-4 key architectural or implementation decisions made.
3. 1-3 potential risks or edge cases identified.
4. A confidence score between 0.0 and 1.0.

Format your response strictly as JSON with this schema:
{
  "summary": "...",
  "keyDecisions": ["...", "..."],
  "identifiedRisks": ["...", "..."],
  "confidenceScore": 0.95
}

REASONING TRANSCRIPT:
${trimmed.slice(0, 4000)}
`;

        const res = await this.provider.generate({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.0
        });

        const jsonMatch = res.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            summary: String(parsed.summary || "Architecture strategy outlined in reasoning transcript."),
            keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions.map(String) : [],
            identifiedRisks: Array.isArray(parsed.identifiedRisks) ? parsed.identifiedRisks.map(String) : [],
            confidenceScore: typeof parsed.confidenceScore === "number" ? Math.max(0, Math.min(1, parsed.confidenceScore)) : 0.8
          };
        }
      } catch (err: unknown) {
        // Fall back to heuristic distillation
      }
    }

    return this.heuristicDistill(trimmed);
  }

  /**
   * Deterministic heuristic extractor when LLM provider is not available or fails.
   */
  public heuristicDistill(transcript: string): ModelOpinionRecord {
    const lines = transcript.split("\n").map((l) => l.trim()).filter(Boolean);
    const keyDecisions: string[] = [];
    const identifiedRisks: string[] = [];

    let summary = "Analyzed constraints and synthesized implementation strategy.";
    if (lines.length > 0) {
      summary = lines[0]!.replace(/^#+\s*/, "").slice(0, 200);
    }

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        lower.startsWith("- ") ||
        lower.startsWith("* ") ||
        lower.includes("decid") ||
        lower.includes("choose") ||
        lower.includes("will use") ||
        lower.includes("approach")
      ) {
        if (keyDecisions.length < 4) {
          keyDecisions.push(line.replace(/^[-*]\s*/, ""));
        }
      }

      if (
        lower.includes("risk") ||
        lower.includes("caution") ||
        lower.includes("edge case") ||
        lower.includes("caveat") ||
        lower.includes("fail") ||
        lower.includes("bug")
      ) {
        if (identifiedRisks.length < 3) {
          identifiedRisks.push(line.replace(/^[-*]\s*/, ""));
        }
      }
    }

    if (keyDecisions.length === 0 && lines.length > 1) {
      keyDecisions.push(lines[1]!.slice(0, 150));
    }

    return {
      summary,
      keyDecisions,
      identifiedRisks,
      confidenceScore: 0.85
    };
  }
}
