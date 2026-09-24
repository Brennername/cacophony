import {
  RulePipelineDeclaration,
  RuleEvaluationContext,
  HistoricalTaskRecord,
} from "@cacophony/shared-types";
import { RulePipelineEngine } from "../rules/RulePipelineEngine.js";

export interface BacktestSimulationSummary {
  readonly totalReplayed: number;
  readonly passedCount: number;
  readonly rejectedCount: number;
  readonly repairsTriggeredCount: number;
  readonly passRatePct: number;
  readonly averageRuleLatencyMs: number;
}

/**
 * RuleBacktestRunner
 *
 * Simulates rule execution over historical tasks and patch diffs,
 * evaluating counterfactual outcomes under candidate rule configurations.
 */
export class RuleBacktestRunner {
  constructor(private readonly engine: RulePipelineEngine) {}

  /**
   * Replays historical task records against a pipeline.
   */
  public async runBacktest(
    pipeline: RulePipelineDeclaration,
    tasks: readonly HistoricalTaskRecord[]
  ): Promise<BacktestSimulationSummary> {
    let passedCount = 0;
    let rejectedCount = 0;
    let repairsTriggeredCount = 0;
    let totalLatency = 0;

    for (const task of tasks) {
      // Simulate file content from patch or synthetic content
      const fakeFilePath = task.focusFiles || "src/index.ts";
      const fileContent = task.patchContent || `// Simulated task content for ${task.id}\nimport { log } from "conductor";\n`;

      const context: RuleEvaluationContext = {
        projectRoot: "/tmp/arena_backtest",
        hook: "post_generation",
        modifiedFiles: [fakeFilePath],
        fileContents: new Map([[fakeFilePath, fileContent]]),
        simulate: true,
      };

      const outcome = await this.engine.executePipelineHook(pipeline, "post_generation", context);
      totalLatency += outcome.durationMs;

      if (outcome.passed) {
        passedCount++;
      } else {
        rejectedCount++;
      }

      repairsTriggeredCount += outcome.repairsApplied.length;
    }

    const totalReplayed = tasks.length;
    const passRatePct = totalReplayed > 0 ? (passedCount / totalReplayed) * 100 : 0;
    const averageRuleLatencyMs = totalReplayed > 0 ? totalLatency / totalReplayed : 0;

    return {
      totalReplayed,
      passedCount,
      rejectedCount,
      repairsTriggeredCount,
      passRatePct: Math.round(passRatePct * 100) / 100,
      averageRuleLatencyMs: Math.round(averageRuleLatencyMs * 100) / 100,
    };
  }
}
