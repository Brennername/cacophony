import type { TaskTelemetryCorrelationRepository } from "@cacophony/db";

export interface ModelEfficiencyScore {
  readonly modelId: string;
  readonly family: "qwen" | "deepseek" | "gemma" | "other";
  readonly totalRuns: number;
  readonly avgTokensPerSec: number;
  readonly avgPeakTemp: number;
  readonly throttleEventCount: number;
  readonly thermalPacingScore: number;
}

/**
 * Service calculating thermal impact, inference velocity, and efficiency scores per model family.
 */
export class TelemetryCorrelationService {
  private readonly correlationRepo: TaskTelemetryCorrelationRepository | undefined;

  constructor(correlationRepo?: TaskTelemetryCorrelationRepository | undefined) {
    this.correlationRepo = correlationRepo;
  }

  /**
   * Calculates efficiency score based on tokens/sec and thermal profile.
   */
  public async getModelEfficiencyScores(): Promise<readonly ModelEfficiencyScore[]> {
    if (!this.correlationRepo) {
      return [];
    }

    const summaries = await this.correlationRepo.getModelEfficiencySummary();
    return summaries.map((s) => {
      let family: "qwen" | "deepseek" | "gemma" | "other" = "other";
      const id = s.modelId.toLowerCase();
      if (id.includes("qwen")) family = "qwen";
      else if (id.includes("deepseek")) family = "deepseek";
      else if (id.includes("gemma")) family = "gemma";

      // Pacing score: higher is better (more tokens/sec, lower temperatures)
      const tempPenalty = Math.max(0, s.avgPeakTemp - 60) * 0.5;
      const throttlePenalty = s.throttleEventCount * 2.0;
      const thermalPacingScore = Math.max(0, Number((s.avgTokensPerSec - tempPenalty - throttlePenalty).toFixed(1)));

      return {
        modelId: s.modelId,
        family,
        totalRuns: s.totalRuns,
        avgTokensPerSec: s.avgTokensPerSec,
        avgPeakTemp: s.avgPeakTemp,
        throttleEventCount: s.throttleEventCount,
        thermalPacingScore
      };
    });
  }

  /**
   * Suggests the best model family if the APU is running elevated/warm.
   */
  public async suggestCoolerModel(currentFamily: string): Promise<string> {
    const scores = await this.getModelEfficiencyScores();
    if (scores.length === 0) {
      return "qwen2.5-coder:3b";
    }
    // Prefer model with lowest average peak temp
    const sorted = [...scores].sort((a, b) => a.avgPeakTemp - b.avgPeakTemp);
    return sorted[0]?.modelId || currentFamily;
  }
}
