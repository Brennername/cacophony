import {
  ReviewDomainPersona,
  PersonaReviewResult,
} from "@cacophony/shared-types";
import {
  ReviewerPersonaPromptFactory,
  ReviewPromptContext,
} from "./ReviewerPersonaPromptFactory.js";

export interface CandidateReviewerConfig {
  readonly modelId: string;
  readonly persona: ReviewDomainPersona;
  readonly maxTokens?: number | undefined;
  readonly temperature?: number | undefined;
}

export interface CandidateReviewExecution {
  readonly modelId: string;
  readonly persona: ReviewDomainPersona;
  readonly result: PersonaReviewResult;
  readonly latencyMs: number;
}

export interface IModelInferenceCaller {
  generate(modelId: string, systemPrompt: string, userPrompt: string): Promise<string>;
}

/**
 * MultiModelConsensusCoordinator
 *
 * Coordinates multi-perspective autonomous code reviews across up to 3 candidate models.
 * Respects single-concurrency hardware constraints by invoking candidate models sequentially,
 * capturing distinct persona verdicts (Security, Architecture, DxUx).
 */
export class MultiModelConsensusCoordinator {
  public static readonly DEFAULT_CANDIDATES: readonly CandidateReviewerConfig[] = [
    { modelId: "qwen2.5-coder:14b", persona: "ArchitectureAuditor", temperature: 0.2 },
    { modelId: "deepseek-r1:8b", persona: "SecurityAuditor", temperature: 0.2 },
    { modelId: "gemma3:4b-it-qat", persona: "DxUxAuditor", temperature: 0.3 },
  ];

  private readonly inferenceCaller: IModelInferenceCaller;
  private readonly candidates: readonly CandidateReviewerConfig[];

  constructor(
    inferenceCaller: IModelInferenceCaller,
    candidates: readonly CandidateReviewerConfig[] = MultiModelConsensusCoordinator.DEFAULT_CANDIDATES
  ) {
    this.inferenceCaller = inferenceCaller;
    // Clamp to maximum of 3 candidate reviewer models
    this.candidates = candidates.slice(0, 3);
  }

  /**
   * Executes multi-model review across configured candidate models and returns individual reviews.
   */
  public async coordinateReview(
    context: ReviewPromptContext
  ): Promise<readonly CandidateReviewExecution[]> {
    const results: CandidateReviewExecution[] = [];

    for (const candidate of this.candidates) {
      const startTime = Date.now();
      const systemPrompt = ReviewerPersonaPromptFactory.createSystemPrompt(candidate.persona);
      const userPrompt = ReviewerPersonaPromptFactory.createUserPrompt(candidate.persona, context);

      try {
        const rawOutput = await this.inferenceCaller.generate(
          candidate.modelId,
          systemPrompt,
          userPrompt
        );
        const parsedResult = ReviewerPersonaPromptFactory.parsePersonaResponse(
          rawOutput,
          candidate.persona
        );

        results.push({
          modelId: candidate.modelId,
          persona: candidate.persona,
          result: parsedResult,
          latencyMs: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          modelId: candidate.modelId,
          persona: candidate.persona,
          result: {
            persona: candidate.persona,
            verdict: "REQUEST_CHANGES",
            findings: [
              {
                path: "review_runner",
                message: `Candidate model ${candidate.modelId} review failed: ${error instanceof Error ? error.message : String(error)}`,
                severity: "blocker",
              },
            ],
            summary: `Model ${candidate.modelId} execution error`,
          },
          latencyMs: Date.now() - startTime,
        });
      }
    }

    return results;
  }
}
