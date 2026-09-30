import type { IInferenceProvider } from "./IInferenceProvider.js";
import { ReasoningDistillationService, type ModelOpinionRecord } from "./ReasoningDistillationService.js";

export interface CognitiveHandoffResult {
  readonly success: boolean;
  readonly reasonerModel: string;
  readonly implementerModel: string;
  readonly distilledBrief: string;
  readonly opinion: ModelOpinionRecord;
  readonly code: string;
  readonly attempts: number;
  readonly tokensPrompt: number;
  readonly tokensCompletion: number;
  readonly tokensPerSec: number;
  readonly rawOutput: string;
}

export interface CognitiveHandoffOptions {
  readonly reasonerModel: string;
  readonly implementerModel: string;
  readonly rawReasoningTranscript: string;
  readonly originalTaskPrompt: string;
  readonly focusFiles: readonly string[];
  readonly directives: readonly string[];
  readonly onChunk?: ((chunk: string) => void) | undefined;
}

/**
 * CognitiveHandoffCoordinator
 *
 * Implements architectural handoff between a heavy reasoning model (e.g. DeepSeek R1)
 * and an implementer coding model (e.g. Qwen 2.5 Coder).
 *
 * When an architect model produces deep reasoning but truncates or terminates without
 * code fences, this coordinator extracts and distills the cognitive trace into a structured
 * implementation brief, then delegates generation to the implementer model with context preserved.
 */
export class CognitiveHandoffCoordinator {
  private readonly provider: IInferenceProvider;
  private readonly distillationService: ReasoningDistillationService;

  constructor(provider: IInferenceProvider, distillationService?: ReasoningDistillationService) {
    this.provider = provider;
    this.distillationService = distillationService || new ReasoningDistillationService(provider);
  }

  /**
   * Transforms a raw reasoning transcript and task into an actionable brief for the implementer model.
   *
   * @param opinion Distilled architectural opinion
   * @param originalPrompt Base user objective
   * @param focusFiles Files targeted for edit
   * @param directives Pipeline directives
   */
  public formatImplementationBrief(
    opinion: ModelOpinionRecord,
    originalPrompt: string,
    focusFiles: readonly string[],
    directives: readonly string[]
  ): string {
    const sections: string[] = [
      "=== ARCHITECTURAL SPECIFICATION & REASONING SUMMARY ===",
      `Executive Summary: ${opinion.summary}`,
      "",
      "Key Architectural Decisions:"
    ];

    for (const decision of opinion.keyDecisions) {
      sections.push(`- ${decision}`);
    }

    if (opinion.identifiedRisks.length > 0) {
      sections.push("", "Critical Constraints & Risks To Avoid:");
      for (const risk of opinion.identifiedRisks) {
        sections.push(`- ${risk}`);
      }
    }

    sections.push(
      "",
      "=== TARGET TASK OBJECTIVE ===",
      originalPrompt,
      "",
      `Target Files: ${focusFiles.join(", ") || "None specified"}`
    );

    if (directives.length > 0) {
      sections.push("", "=== DIRECTIVES ===");
      for (const dir of directives) {
        sections.push(`- ${dir}`);
      }
    }

    sections.push(
      "",
      "=== INSTRUCTIONS FOR IMPLEMENTER ===",
      "You are the senior implementation engineer. The software architect above has completed the high-level design.",
      "Your sole objective is to write the complete, production-ready code fulfilling all architectural decisions and constraints.",
      "Enclose all code in markdown code fences. Do NOT repeat or output cognitive thinking tags."
    );

    return sections.join("\n");
  }

  /**
   * Executes handoff from architect reasoning trace to implementer model.
   */
  public async executeHandoff(options: CognitiveHandoffOptions): Promise<CognitiveHandoffResult> {
    const {
      reasonerModel,
      implementerModel,
      rawReasoningTranscript,
      originalTaskPrompt,
      focusFiles,
      directives,
      onChunk
    } = options;

    // 1. Distill reasoning transcript
    const opinion = await this.distillationService.distillOpinion(rawReasoningTranscript, implementerModel);

    // 2. Synthesize actionable implementation prompt
    const implementationBrief = this.formatImplementationBrief(
      opinion,
      originalTaskPrompt,
      focusFiles,
      directives
    );

    // 3. Dispatch to implementer model
    const response = onChunk
      ? await this.provider.stream(
          {
            model: implementerModel,
            messages: [{ role: "user", content: implementationBrief }],
            temperature: 0.1
          },
          onChunk
        )
      : await this.provider.generate({
          model: implementerModel,
          messages: [{ role: "user", content: implementationBrief }],
          temperature: 0.1
        });

    return {
      success: true,
      reasonerModel,
      implementerModel,
      distilledBrief: implementationBrief,
      opinion,
      code: response.content,
      attempts: 1,
      tokensPrompt: response.tokensPrompt,
      tokensCompletion: response.tokensCompletion,
      tokensPerSec: response.tokensPerSec,
      rawOutput: response.content
    };
  }
}
