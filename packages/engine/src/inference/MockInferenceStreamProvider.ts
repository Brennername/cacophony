import type {
  InferenceRequest,
  InferenceResponse,
  InferenceProviderType
} from "@cacophony/shared-types";
import type { IInferenceProvider } from "./IInferenceProvider.js";

/**
 * MockInferenceStreamProvider
 *
 * Simulates an authentic streaming LLM code generation session with realistic
 * tokens-per-second pacing, multi-chunk emits, and syntactically valid code blocks.
 * Enables zero-GPU demo showcases and cloud deployments (e.g. Render, Fly.io, Heroku).
 *
 * Token velocity is derived from model family size when the request carries a model
 * name, so the leaderboard and history show meaningfully different efficiency ratings
 * (e.g. qwen2.5-coder:3b runs fast, deepseek-r1:8b reasons slowly).
 */
export class MockInferenceStreamProvider implements IInferenceProvider {
  private readonly defaultSnippet: string;
  private readonly defaultTokensPerSecond: number;

  constructor(tokensPerSecond: number = 32) {
    this.defaultTokensPerSecond = tokensPerSecond;
    this.defaultSnippet = [
      "// Autonomous Worker Pipeline: Synthetic Implementation",
      "import { Injectable, signal, computed } from '@angular/core';",
      "import type { TaskRecord, GpuMetrics } from '@cacophony/shared-types';",
      "",
      "@Injectable({ providedIn: 'root' })",
      "export class AutonomousTelemetryService {",
      "  private readonly currentGpuLoad = signal<number>(42.5);",
      "  private readonly currentVramPercent = signal<number>(28.4);",
      "  private readonly isNominalState = computed(() => this.currentGpuLoad() < 80);",
      "",
      "  public getTelemetrySnapshot(): GpuMetrics {",
      "    return {",
      "      gpuBusyPercent: this.currentGpuLoad(),",
      "      vramUsedBytes: 4683075584,",
      "      vramTotalBytes: 16777216000,",
      "      vramPercent: this.currentVramPercent(),",
      "      gttUsedBytes: 157286400,",
      "      gttTotalBytes: 8388608000,",
      "      edgeTempCelsius: 58.4,",
      "      vddgfxMilliVolts: 850,",
      "      socMilliVolts: 750,",
      "      pptWatts: 14.8,",
      "      sclkMhz: 1200",
      "    };",
      "  }",
      "}"
    ].join("\n");
  }

  /**
   * Derives a realistic tokens-per-second rate from the model name.
   * Calibrated to typical AMD APU Vega throughput per model family size:
   *   - 3B  (fast coder): ~54 tok/s
   *   - 4B  (balanced):   ~38 tok/s
   *   - 7B  (larger):     ~28 tok/s
   *   - 8B  (reasoning):  ~16 tok/s
   * Falls back to the constructor default for unknown model names.
   */
  private getTokensPerSecondForModel(modelName?: string): number {
    if (!modelName) return this.defaultTokensPerSecond;
    const lower = modelName.toLowerCase();
    if (lower.includes(":3b") || lower.includes("-3b")) return 54.0;
    if (lower.includes(":4b") || lower.includes("-4b")) return 38.0;
    if (lower.includes(":7b") || lower.includes("-7b")) return 28.5;
    if (lower.includes(":8b") || lower.includes("-8b")) return 16.5;
    if (lower.includes("deepseek-r1")) return 16.5;
    return this.defaultTokensPerSecond;
  }

  public getProviderType(): InferenceProviderType {
    return "ollama";
  }

  public async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const tokensPerSecond = this.getTokensPerSecondForModel(request.model);
    const content = this.defaultSnippet;
    const totalTokens = Math.round(content.length / 4);
    const durationMs = (totalTokens / tokensPerSecond) * 1000;

    return {
      content,
      model: request.model || "qwen2.5-coder:7b",
      tokensPrompt: 128,
      tokensCompletion: totalTokens,
      totalTokens: 128 + totalTokens,
      latencyMs: Math.max(10, Math.round(durationMs)),
      tokensPerSec: tokensPerSecond
    };
  }

  public async stream(
    request: InferenceRequest,
    onChunk: (chunk: string) => void
  ): Promise<InferenceResponse> {
    const tokensPerSecond = this.getTokensPerSecondForModel(request.model);
    const startMs = Date.now();
    const content = this.defaultSnippet;

    // Divide snippet into small code tokens/words
    const tokens = content.match(/(\s+|\w+|[^\s\w]+)/g) || [content];
    const delayPerChunkMs = Math.max(15, Math.round(1000 / tokensPerSecond));

    for (const chunk of tokens) {
      onChunk(chunk);
      // Pacing breath between tokens to simulate live model generation
      await new Promise((resolve) => setTimeout(resolve, delayPerChunkMs));
    }

    const durationMs = Date.now() - startMs;
    const tokensGenerated = tokens.length;
    const measuredTps = Number(((tokensGenerated / (durationMs / 1000)) || tokensPerSecond).toFixed(1));

    return {
      content,
      model: request.model || "qwen2.5-coder:7b",
      tokensPrompt: 128,
      tokensCompletion: tokensGenerated,
      totalTokens: 128 + tokensGenerated,
      latencyMs: durationMs,
      tokensPerSec: measuredTps
    };
  }
}
