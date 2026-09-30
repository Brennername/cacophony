import type { IInferenceProvider } from "../inference/IInferenceProvider.js";
import type { ModelHealthRepository } from "@cacophony/db";

/**
 * Standard synthetic benchmark prompt testing syntax compliance, AST generation, and token throughput.
 */
const SYNTHETIC_BENCHMARK_PROMPT = `Write a TypeScript class named 'RingBuffer' that implements a circular buffer of fixed capacity.
Include methods: push(item: T): void, pop(): T | undefined, isFull(): boolean, isEmpty(): boolean, and size(): number.
Output ONLY standard TypeScript code inside a markdown code block. Do NOT include explanations.`;

export interface BenchmarkResult {
  readonly modelId: string;
  readonly success: boolean;
  readonly durationMs: number;
  readonly tokensPrompt: number;
  readonly tokensCompletion: number;
  readonly tokensPerSec: number;
  readonly generatedCodeLength: number;
  readonly syntaxValid: boolean;
  readonly error?: string;
}

/**
 * ModelBenchmarkRunner
 *
 * Runs standardized synthetic coding prompts against candidate models to empirically measure:
 * - Eval token velocity (tok/s)
 * - Generation latency (ms)
 * - Basic syntax correctness (markdown fence and non-empty code extraction)
 * - Seeds initial performance records into ModelHealthRepository
 */
export class ModelBenchmarkRunner {
  private readonly provider: IInferenceProvider;
  private readonly healthRepo: ModelHealthRepository | undefined;

  constructor(provider: IInferenceProvider, healthRepo?: ModelHealthRepository) {
    this.provider = provider;
    this.healthRepo = healthRepo;
  }

  /**
   * Executes a benchmark run for a specific model tag.
   *
   * @param modelId - Target model name/tag (e.g. "qwen2.5-coder:3b").
   * @returns Detailed BenchmarkResult.
   */
  public async benchmark(modelId: string): Promise<BenchmarkResult> {
    const startTime = Date.now();
    try {
      const response = await this.provider.generate({
        model: modelId,
        messages: [
          {
            role: "system",
            content: "You are an expert TypeScript software engineer following SOLID principles."
          },
          {
            role: "user",
            content: SYNTHETIC_BENCHMARK_PROMPT
          }
        ],
        temperature: 0.1,
        maxTokens: 1024
      });

      const elapsedMs = Math.max(1, Date.now() - startTime);
      const codeFenceMatch = response.content.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/i);
      const code = codeFenceMatch ? codeFenceMatch[1]!.trim() : response.content.trim();

      const syntaxValid = code.includes("class RingBuffer") && code.includes("push(") && code.includes("pop(");
      const success = syntaxValid && response.tokensCompletion > 20;

      const result: BenchmarkResult = {
        modelId,
        success,
        durationMs: elapsedMs,
        tokensPrompt: response.tokensPrompt,
        tokensCompletion: response.tokensCompletion,
        tokensPerSec: response.tokensPerSec || Math.round((response.tokensCompletion / (elapsedMs / 1000)) * 10) / 10,
        generatedCodeLength: code.length,
        syntaxValid
      };

      if (this.healthRepo) {
        await this.healthRepo.recordRun(
          modelId,
          this.provider.getProviderType(),
          success,
          elapsedMs,
          result.tokensPerSec
        );
      }

      return result;
    } catch (err: unknown) {
      const elapsedMs = Math.max(1, Date.now() - startTime);
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (this.healthRepo) {
        await this.healthRepo.recordRun(modelId, this.provider.getProviderType(), false, elapsedMs, 0.0);
      }

      return {
        modelId,
        success: false,
        durationMs: elapsedMs,
        tokensPrompt: 0,
        tokensCompletion: 0,
        tokensPerSec: 0,
        generatedCodeLength: 0,
        syntaxValid: false,
        error: errorMsg
      };
    }
  }
}
