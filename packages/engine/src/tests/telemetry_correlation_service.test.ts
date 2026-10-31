import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TelemetryCorrelationService } from "../telemetry/TelemetryCorrelationService.js";
import type { TaskTelemetryCorrelationRepository } from "@cacophony/db";

describe("TelemetryCorrelationService Test Suite", () => {
  const createMockRepo = (
    summaries: readonly {
      readonly modelId: string;
      readonly totalRuns: number;
      readonly avgTokensPerSec: number;
      readonly avgPeakTemp: number;
      readonly throttleEventCount: number;
    }[],
  ): TaskTelemetryCorrelationRepository => {
    return {
      getModelEfficiencySummary: async () => summaries,
    } as unknown as TaskTelemetryCorrelationRepository;
  };

  describe("Repository Configuration and Edge Cases", () => {
    it("should return empty scores when repository is not provided", async () => {
      const service = new TelemetryCorrelationService();
      const scores = await service.getModelEfficiencyScores();
      assert.deepStrictEqual(scores, []);
    });

    it("should return fallback cooler model when no scores are available", async () => {
      const service = new TelemetryCorrelationService();
      const cooler = await service.suggestCoolerModel("deepseek-r1:14b");
      assert.strictEqual(cooler, "qwen2.5-coder:3b");
    });
  });

  describe("Model Family Classification and Pacing Score", () => {
    it("should classify model families and calculate thermal pacing score accurately", async () => {
      const mockSummaries = [
        {
          modelId: "qwen2.5-coder:7b",
          totalRuns: 20,
          avgTokensPerSec: 42.0,
          avgPeakTemp: 55.0, // <= 60, tempPenalty = 0
          throttleEventCount: 0,
        },
        {
          modelId: "deepseek-coder-v2:16b",
          totalRuns: 15,
          avgTokensPerSec: 30.0,
          avgPeakTemp: 74.0, // tempPenalty = (74 - 60) * 0.5 = 7.0
          throttleEventCount: 2, // throttlePenalty = 4.0
        },
        {
          modelId: "gemma3:4b",
          totalRuns: 10,
          avgTokensPerSec: 60.0,
          avgPeakTemp: 62.0, // tempPenalty = (62 - 60) * 0.5 = 1.0
          throttleEventCount: 1, // throttlePenalty = 2.0
        },
        {
          modelId: "custom-transformer:3b",
          totalRuns: 5,
          avgTokensPerSec: 25.0,
          avgPeakTemp: 50.0,
          throttleEventCount: 0,
        },
      ];

      const repo = createMockRepo(mockSummaries);
      const service = new TelemetryCorrelationService(repo);
      const scores = await service.getModelEfficiencyScores();

      assert.strictEqual(scores.length, 4);

      // Qwen verification
      const qwenScore = scores.find((s) => s.modelId === "qwen2.5-coder:7b");
      assert.ok(qwenScore);
      assert.strictEqual(qwenScore.family, "qwen");
      assert.strictEqual(qwenScore.thermalPacingScore, 42.0);

      // Deepseek verification
      const deepseekScore = scores.find((s) => s.modelId === "deepseek-coder-v2:16b");
      assert.ok(deepseekScore);
      assert.strictEqual(deepseekScore.family, "deepseek");
      // 30.0 - 7.0 - 4.0 = 19.0
      assert.strictEqual(deepseekScore.thermalPacingScore, 19.0);

      // Gemma verification
      const gemmaScore = scores.find((s) => s.modelId === "gemma3:4b");
      assert.ok(gemmaScore);
      assert.strictEqual(gemmaScore.family, "gemma");
      // 60.0 - 1.0 - 2.0 = 57.0
      assert.strictEqual(gemmaScore.thermalPacingScore, 57.0);

      // Custom verification
      const customScore = scores.find((s) => s.modelId === "custom-transformer:3b");
      assert.ok(customScore);
      assert.strictEqual(customScore.family, "other");
      assert.strictEqual(customScore.thermalPacingScore, 25.0);
    });

    it("should clamp thermal pacing score to zero when penalties exceed tokens per sec", async () => {
      const mockSummaries = [
        {
          modelId: "hot-model:14b",
          totalRuns: 5,
          avgTokensPerSec: 10.0,
          avgPeakTemp: 90.0, // penalty = 15.0
          throttleEventCount: 5, // penalty = 10.0
        },
      ];

      const repo = createMockRepo(mockSummaries);
      const service = new TelemetryCorrelationService(repo);
      const scores = await service.getModelEfficiencyScores();

      assert.strictEqual(scores[0]?.thermalPacingScore, 0);
    });
  });

  describe("Cooler Model Recommendation", () => {
    it("should suggest the model with lowest average peak temperature", async () => {
      const mockSummaries = [
        {
          modelId: "hot-model:14b",
          totalRuns: 10,
          avgTokensPerSec: 35.0,
          avgPeakTemp: 82.0,
          throttleEventCount: 3,
        },
        {
          modelId: "cool-model:3b",
          totalRuns: 10,
          avgTokensPerSec: 50.0,
          avgPeakTemp: 48.0,
          throttleEventCount: 0,
        },
        {
          modelId: "mid-model:7b",
          totalRuns: 10,
          avgTokensPerSec: 40.0,
          avgPeakTemp: 64.0,
          throttleEventCount: 1,
        },
      ];

      const repo = createMockRepo(mockSummaries);
      const service = new TelemetryCorrelationService(repo);
      const recommended = await service.suggestCoolerModel("hot-model:14b");

      assert.strictEqual(recommended, "cool-model:3b");
    });
  });
});
