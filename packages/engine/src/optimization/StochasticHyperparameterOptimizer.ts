import {
  PipelineHyperparameterGenome,
  OptimizationRunResult,
  RulePipelineDeclaration,
  RuleSeverity,
} from "@cacophony/shared-types";
import { RulePipelineEngine } from "../rules/RulePipelineEngine.js";
import { RuleBacktestRunner } from "./RuleBacktestRunner.js";
import { HistoricalTaskRecord } from "@cacophony/shared-types";

export interface OptimizerOptions {
  readonly strategy?: "random_search" | "genetic_evolution" | "bayesian";
  readonly generations?: number;
  readonly populationSize?: number;
  readonly mutationRate?: number;
}

/**
 * StochasticHyperparameterOptimizer
 *
 * Implements genetic evolution and stochastic random search across rule pipeline genomes,
 * discovering optimal severity levels and ordering to maximize pass rate and minimize false rejections.
 */
export class StochasticHyperparameterOptimizer {
  private readonly backtestRunner: RuleBacktestRunner;

  constructor(engine: RulePipelineEngine) {
    this.backtestRunner = new RuleBacktestRunner(engine);
  }

  /**
   * Runs hyperparameter optimization against historical task benchmark data.
   */
  public async optimize(
    targetModel: string,
    tasks: readonly HistoricalTaskRecord[],
    options: OptimizerOptions = {}
  ): Promise<OptimizationRunResult> {
    const start = performance.now();
    const strategy = options.strategy || "genetic_evolution";
    const generations = options.generations || 5;
    const populationSize = options.populationSize || 8;
    const mutationRate = options.mutationRate || 0.25;

    const candidateRules = [
      "strip_emojis",
      "enforce_esm_js",
      "whitespace_normalizer",
      "loose_root_files",
      "empty_files",
      "placeholder_stubs",
      "banned_imports",
      "ast_signature_align",
    ];

    const severities: RuleSeverity[] = ["silent_repair", "soft_warning", "hard_rejection", "disabled"];

    // Generate initial population
    let population: PipelineHyperparameterGenome[] = Array.from({ length: populationSize }, (_, idx) => {
      const enablement: Record<string, boolean> = {};
      const ruleSeverities: Record<string, RuleSeverity> = {};
      for (const ruleId of candidateRules) {
        enablement[ruleId] = Math.random() > 0.15;
        ruleSeverities[ruleId] = severities[Math.floor(Math.random() * severities.length)]!;
      }
      return {
        pipelineId: `genome_${idx}`,
        ruleEnablement: enablement,
        ruleSeverities,
        ruleOrdering: [...candidateRules].sort(() => Math.random() - 0.5),
      };
    });

    let bestGenome: PipelineHyperparameterGenome = population[0]!;
    let bestScore = -1;
    let baselinePassRatePct = 0;
    let candidatesTested = 0;

    for (let gen = 0; gen < generations; gen++) {
      const scoredPopulation: { genome: PipelineHyperparameterGenome; score: number; passRatePct: number }[] = [];

      for (const genome of population) {
        candidatesTested++;
        const pipeline = this.genomeToPipeline(genome);
        const sim = await this.backtestRunner.runBacktest(pipeline, tasks);

        // Multi-objective loss/fitness:
        // Reward high pass rate, penalize high latency
        const score = sim.passRatePct * 0.95 - (sim.averageRuleLatencyMs > 5 ? 10 : 0);

        if (candidatesTested === 1) {
          baselinePassRatePct = sim.passRatePct;
        }

        scoredPopulation.push({ genome: { ...genome, fitnessScore: score }, score, passRatePct: sim.passRatePct });

        if (score > bestScore) {
          bestScore = score;
          bestGenome = { ...genome, fitnessScore: score };
        }
      }

      if (strategy === "genetic_evolution") {
        // Selection: Top 50%
        scoredPopulation.sort((a, b) => b.score - a.score);
        const survivors = scoredPopulation.slice(0, Math.max(2, Math.floor(populationSize / 2))).map((s) => s.genome);

        // Breed next generation with mutation
        const nextGen: PipelineHyperparameterGenome[] = [...survivors];
        while (nextGen.length < populationSize) {
          const parentA = survivors[Math.floor(Math.random() * survivors.length)]!;
          const parentB = survivors[Math.floor(Math.random() * survivors.length)]!;
          const child = this.crossoverAndMutate(parentA, parentB, candidateRules, severities, mutationRate);
          nextGen.push(child);
        }
        population = nextGen;
      }
    }

    const finalPipeline = this.genomeToPipeline(bestGenome);
    const finalSim = await this.backtestRunner.runBacktest(finalPipeline, tasks);

    return {
      targetModel,
      strategy,
      generationsEvaluated: generations,
      candidatesTested,
      baselinePassRatePct: Math.round(baselinePassRatePct * 100) / 100,
      optimizedPassRatePct: Math.round(finalSim.passRatePct * 100) / 100,
      bestGenome,
      executionDurationMs: Math.round(performance.now() - start),
    };
  }

  private crossoverAndMutate(
    pA: PipelineHyperparameterGenome,
    pB: PipelineHyperparameterGenome,
    rules: readonly string[],
    severities: readonly RuleSeverity[],
    mutationRate: number
  ): PipelineHyperparameterGenome {
    const enablement: Record<string, boolean> = {};
    const ruleSeverities: Record<string, RuleSeverity> = {};

    for (const rule of rules) {
      // Crossover
      enablement[rule] = Math.random() > 0.5 ? pA.ruleEnablement[rule]! : pB.ruleEnablement[rule]!;
      ruleSeverities[rule] = Math.random() > 0.5 ? pA.ruleSeverities[rule]! : pB.ruleSeverities[rule]!;

      // Mutation
      if (Math.random() < mutationRate) {
        enablement[rule] = !enablement[rule];
      }
      if (Math.random() < mutationRate) {
        ruleSeverities[rule] = severities[Math.floor(Math.random() * severities.length)]!;
      }
    }

    return {
      pipelineId: `mutant_${Date.now()}`,
      ruleEnablement: enablement,
      ruleSeverities,
      ruleOrdering: Math.random() > 0.5 ? [...pA.ruleOrdering] : [...pB.ruleOrdering],
    };
  }

  private genomeToPipeline(genome: PipelineHyperparameterGenome): RulePipelineDeclaration {
    return {
      id: genome.pipelineId,
      name: `Optimized Pipeline ${genome.pipelineId}`,
      hooks: [
        {
          hook: "post_generation",
          rules: genome.ruleOrdering
            .filter((r) => genome.ruleEnablement[r] !== false)
            .map((r) => ({
              ruleId: r,
              severity: genome.ruleSeverities[r] || "silent_repair",
            })),
        },
      ],
    };
  }
}
