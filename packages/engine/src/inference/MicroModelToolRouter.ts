import { IModelInferenceCaller } from "./MultiModelConsensusCoordinator.js";

export type TaskGenerationStrategy = "MONOLITHIC_FILE_GENERATION" | "HASH_STUB_SPLICING";

export interface TaskRoutingContext {
  readonly taskTitle: string;
  readonly taskPrompt: string;
  readonly targetFilePath?: string | undefined;
  readonly existingFileLines?: number | undefined;
  readonly existingMethodCount?: number | undefined;
}

export interface StrategyRouteDecision {
  readonly strategy: TaskGenerationStrategy;
  readonly modelUsed: string;
  readonly latencyMs: number;
  readonly confidence: number;
  readonly reasoning: string;
}

/**
 * MicroModelToolRouter
 *
 * Employs sub-1B / 3B micro-models (smollm2:135m, qwen2.5-coder:3b) to provide
 * ultra-low latency (<200ms) binary strategy dispatching:
 * - MONOLITHIC_FILE_GENERATION: small files (< 150 lines), new modules, or standalone components.
 * - HASH_STUB_SPLICING: complex classes, multi-method updates, or files >= 150 lines.
 */
export class MicroModelToolRouter {
  public static readonly DEFAULT_MICRO_MODEL = "qwen2.5-coder:3b";
  public static readonly FALLBACK_MICRO_MODEL = "smollm2:135m";
  public static readonly LINE_THRESHOLD_FOR_SPLICING = 150;

  private readonly inferenceCaller?: IModelInferenceCaller | undefined;
  private readonly defaultModel: string;

  constructor(
    inferenceCaller?: IModelInferenceCaller,
    defaultModel: string = MicroModelToolRouter.DEFAULT_MICRO_MODEL
  ) {
    this.inferenceCaller = inferenceCaller;
    this.defaultModel = defaultModel;
  }

  /**
   * Evaluates task context and classifies the optimal generation strategy.
   */
  public async routeTaskStrategy(
    context: TaskRoutingContext,
    preferredModel?: string
  ): Promise<StrategyRouteDecision> {
    const startTime = Date.now();
    const modelToUse = preferredModel ?? this.defaultModel;

    // Fast heuristic pre-check when explicit file line count is already known
    if (context.existingFileLines !== undefined && context.existingFileLines >= MicroModelToolRouter.LINE_THRESHOLD_FOR_SPLICING) {
      return {
        strategy: "HASH_STUB_SPLICING",
        modelUsed: "heuristic-line-guard",
        latencyMs: Date.now() - startTime,
        confidence: 0.99,
        reasoning: `Target file has ${context.existingFileLines} lines (>= threshold ${MicroModelToolRouter.LINE_THRESHOLD_FOR_SPLICING}).`,
      };
    }

    if (!this.inferenceCaller) {
      // Deterministic heuristic classifier fallback
      return this.evaluateHeuristic(context, startTime, "heuristic-fallback");
    }

    const systemPrompt = `You are a sub-millisecond code generation strategy classifier.
Classify the given task into one of two strategies:
1. "MONOLITHIC_FILE_GENERATION": file is small (< 150 lines), new file, or standalone component.
2. "HASH_STUB_SPLICING": file is large (>= 150 lines), existing multi-method class, or requires preserving sibling methods.

Respond ONLY with valid JSON:
{"strategy": "MONOLITHIC_FILE_GENERATION" | "HASH_STUB_SPLICING", "confidence": 0.9, "reasoning": "brief explanation"}`;

    const userPrompt = `Task: ${context.taskTitle}
Prompt: ${context.taskPrompt}
Target File: ${context.targetFilePath ?? "unspecified"}
Existing Lines: ${context.existingFileLines ?? "unknown"}
Existing Methods: ${context.existingMethodCount ?? "unknown"}`;

    try {
      const output = await this.inferenceCaller.generate(
        modelToUse,
        systemPrompt,
        userPrompt
      );

      const decision = this.parseClassification(output);
      return {
        strategy: decision.strategy,
        modelUsed: modelToUse,
        latencyMs: Date.now() - startTime,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
      };
    } catch {
      return this.evaluateHeuristic(context, startTime, "heuristic-error-fallback");
    }
  }

  /**
   * Constrained JSON parser for structured micro-model classification output.
   */
  public parseClassification(output: string): {
    strategy: TaskGenerationStrategy;
    confidence: number;
    reasoning: string;
  } {
    try {
      const match = output.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (
          parsed.strategy === "HASH_STUB_SPLICING" ||
          parsed.strategy === "MONOLITHIC_FILE_GENERATION"
        ) {
          return {
            strategy: parsed.strategy,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
            reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "Classified by micro-model",
          };
        }
      }
    } catch {
      // Fall through to keyword detection
    }

    const isSplicing = /HASH_STUB|SPLICING|LARGE|COMPLEX|MULTI_METHOD/i.test(output);
    return {
      strategy: isSplicing ? "HASH_STUB_SPLICING" : "MONOLITHIC_FILE_GENERATION",
      confidence: 0.75,
      reasoning: "Heuristic parse from micro-model text output",
    };
  }

  /**
   * Deterministic heuristic classification when inference is bypassed or unavailable.
   */
  private evaluateHeuristic(
    context: TaskRoutingContext,
    startTime: number,
    modelTag: string
  ): StrategyRouteDecision {
    const isLargeFile =
      context.existingFileLines !== undefined &&
      context.existingFileLines >= MicroModelToolRouter.LINE_THRESHOLD_FOR_SPLICING;

    const hasMultiMethods =
      context.existingMethodCount !== undefined && context.existingMethodCount >= 3;

    const indicatesMethodEdit =
      /\b(?:add method|implement method|update method|modify method|refactor method|calculate|process)\b/i.test(
        context.taskPrompt
      );

    const useSplicing = isLargeFile || hasMultiMethods || indicatesMethodEdit;

    return {
      strategy: useSplicing ? "HASH_STUB_SPLICING" : "MONOLITHIC_FILE_GENERATION",
      modelUsed: modelTag,
      latencyMs: Date.now() - startTime,
      confidence: 0.9,
      reasoning: useSplicing
        ? "Classified as HASH_STUB_SPLICING based on method count or prompt semantics."
        : "Classified as MONOLITHIC_FILE_GENERATION for small or new file creation.",
    };
  }
}
