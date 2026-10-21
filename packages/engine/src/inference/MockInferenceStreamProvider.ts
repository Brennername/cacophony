import type {
  InferenceRequest,
  InferenceResponse,
  InferenceProviderType,
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
  private readonly targetTokensPerSecond: number;
  private readonly burstAllowance: number;

  /**
   * Initializes MockInferenceStreamProvider with rate limiting and burst bounds.
   *
   * @param targetTokensPerSecond - Baseline average generation velocity (defaults to 11.0 tok/s).
   * @param burstAllowance - Maximum random burst delta in either direction (defaults to half the target: 5.5 tok/s).
   */
  constructor(targetTokensPerSecond: number = 11.0, burstAllowance?: number) {
    this.targetTokensPerSecond = targetTokensPerSecond;
    this.burstAllowance = burstAllowance !== undefined ? burstAllowance : targetTokensPerSecond / 2;
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
      "}",
    ].join("\n");
  }

  /**
   * Derives a realistic average tokens-per-second baseline for the model family,
   * centered strictly around the target rate (~11.0 tok/s) and constrained within the burst allowance.
   */
  public getTokensPerSecondForModel(modelName?: string): number {
    const base = this.targetTokensPerSecond;
    if (!modelName) return base;
    const lower = modelName.toLowerCase();

    // Minor model family nuances centered around target (e.g. 11.0 tok/s)
    const deltaRatio = this.burstAllowance / 5.5;
    if (lower.includes(":3b") || lower.includes("-3b")) {
      return Number((base + 1.5 * deltaRatio).toFixed(2));
    }
    if (lower.includes(":4b") || lower.includes("-4b")) {
      return Number((base + 0.5 * deltaRatio).toFixed(2));
    }
    if (lower.includes(":8b") || lower.includes("-8b") || lower.includes("deepseek-r1")) {
      return Number(Math.max(1, base - 1.5 * deltaRatio).toFixed(2));
    }
    return base;
  }

  public getProviderType(): InferenceProviderType {
    return "ollama";
  }

  private resolveContentForRequest(request: InferenceRequest): string {
    const userMessage = request.messages?.find((m) => m.role === "user")?.content || "";

    if (userMessage.includes("Decompose the following high-level objective") || userMessage.includes("raw JSON array")) {
      return JSON.stringify(
        [
          {
            title: "Define type contracts and interfaces",
            prompt: "Create comprehensive TypeScript interfaces enforcing clean structural contracts.",
            role: "architect",
            priority: "P1",
            focusFiles: "packages/engine/src/core/contracts.ts",
            testCommand: "npm test --workspace=@cacophony/engine --if-present",
          },
          {
            title: "Implement core service unit",
            prompt: "Implement domain service satisfying interface contracts with robust error boundaries.",
            role: "implementer",
            priority: "P1",
            focusFiles: "packages/engine/src/core/service.ts",
            testCommand: "npm test --workspace=@cacophony/engine --if-present",
          },
          {
            title: "Write unit test verification suite",
            prompt: "Construct node:test suite verifying happy path and failure edge cases.",
            role: "test_engineer",
            priority: "P1",
            focusFiles: "packages/engine/src/tests/service.test.ts",
            testCommand: "node --test packages/engine/dist/tests/service.test.js",
          },
        ],
        null,
        2,
      );
    }

    if (userMessage.includes("Review") || userMessage.includes("APPROVE") || userMessage.includes("verdict")) {
      return JSON.stringify({
        verdict: "APPROVE",
        summary: "Code adheres to single responsibility principle and strict typing invariants.",
        comments: [
          "Contract boundaries are well defined.",
          "Error boundaries prevent unhandled exceptions.",
        ],
      });
    }

    // Default to markdown-fenced TypeScript code
    return `\`\`\`typescript\n${this.defaultSnippet}\n\`\`\``;
  }

  public async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const tokensPerSecond = this.getTokensPerSecondForModel(request.model);
    const content = this.resolveContentForRequest(request);
    const totalTokens = Math.round(content.length / 4);
    const durationMs = (totalTokens / tokensPerSecond) * 1000;

    return {
      content,
      model: request.model || "qwen2.5-coder:7b",
      tokensPrompt: 128,
      tokensCompletion: totalTokens,
      totalTokens: 128 + totalTokens,
      latencyMs: Math.max(10, Math.round(durationMs)),
      tokensPerSec: tokensPerSecond,
    };
  }

  public async stream(
    request: InferenceRequest,
    onChunk: (chunk: string) => void,
  ): Promise<InferenceResponse> {
    const averageTarget = this.getTokensPerSecondForModel(request.model);
    const burst = this.burstAllowance;
    const startMs = Date.now();
    const content = this.resolveContentForRequest(request);

    // Divide snippet into small code tokens/words
    const tokens = content.match(/(\s+|\w+|[^\s\w]+)/g) || [content];

    for (const chunk of tokens) {
      onChunk(chunk);
      // Realistic random burst pacing: instantaneous velocity fluctuates up to half the average target in either direction
      // For default 11 tok/s target, instantaneous rate oscillates randomly between [5.5, 16.5] tok/s
      const jitter = (Math.random() * 2 - 1) * burst;
      const instantaneousRate = Math.max(1, averageTarget + jitter);
      const delayMs = Math.round(1000 / instantaneousRate);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const durationMs = Math.max(1, Date.now() - startMs);
    const tokensGenerated = tokens.length;
    const measuredTps = Number(
      (tokensGenerated / (durationMs / 1000) || averageTarget).toFixed(1),
    );

    return {
      content,
      model: request.model || "qwen2.5-coder:7b",
      tokensPrompt: 128,
      tokensCompletion: tokensGenerated,
      totalTokens: 128 + tokensGenerated,
      latencyMs: durationMs,
      tokensPerSec: measuredTps,
    };
  }
}
