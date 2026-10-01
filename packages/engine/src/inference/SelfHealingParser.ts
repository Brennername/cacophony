import { AdaptiveOutputFormatter, type ExtractedCodeBlock } from "./AdaptiveOutputFormatter.js";
import type { IInferenceProvider } from "./IInferenceProvider.js";
import type { ChatMessage, InferenceRequest } from "@cacophony/shared-types";

export interface ParseValidationResult {
  readonly valid: boolean;
  readonly code: string | null;
  readonly error?: string;
  readonly blocks: readonly ExtractedCodeBlock[];
}

/**
 * SelfHealingParser
 *
 * Implements the Self-Healing Parse and Feedback Loops from the Technical Design Document:
 * 1. Automatically inspects LLM outputs for structural compliance and code fences.
 * 2. Intercepts common failure modes such as placeholder comments ('// ... existing code ...')
 *    or omitted code fences.
 * 3. Appends corrective follow-up prompts with exact error messages within a bounded retry limit.
 */
export class SelfHealingParser {
  private readonly formatter: AdaptiveOutputFormatter;
  private readonly maxRetries: number;

  constructor(formatter: AdaptiveOutputFormatter = new AdaptiveOutputFormatter(), maxRetries = 2) {
    this.formatter = formatter;
    this.maxRetries = maxRetries;
  }

  public getFormatter(): AdaptiveOutputFormatter {
    return this.formatter;
  }

  /**
   * Inspects model output for structural compliance and extracted code.
   */
  public validate(rawOutput: string): ParseValidationResult {
    if (!rawOutput || rawOutput.trim().length === 0) {
      return {
        valid: false,
        code: null,
        error: "Model emitted an empty or whitespace-only response.",
        blocks: []
      };
    }

    const blocks = this.formatter.extractCodeBlocks(rawOutput);
    if (blocks.length === 0) {
      // Check if output was truncated inside a think block or had multiple unclosed think blocks
      const lastOpenThink = rawOutput.lastIndexOf("<think>");
      const lastCloseThink = rawOutput.lastIndexOf("</think>");

      if (lastOpenThink !== -1 && (lastCloseThink === -1 || lastOpenThink > lastCloseThink)) {
        return {
          valid: false,
          code: null,
          error: "Output was cut off inside a thinking block (<think>) before completing the analysis and writing code. Please continue immediately, close the thought, and emit the complete code inside markdown code fences (```).",
          blocks: []
        };
      }

      if (rawOutput.includes("</think>") && !rawOutput.includes("```")) {
        return {
          valid: false,
          code: null,
          error: "Thinking block completed, but response was cut off before emitting the code block. Provide the complete code implementation inside markdown code fences (```) now.",
          blocks: []
        };
      }

      return {
        valid: false,
        code: null,
        error: "Missing required markdown code fence (```<language> ... ```). Output must enclose complete code inside code fences.",
        blocks: []
      };
    }

    const primary = this.formatter.extractPrimaryCode(rawOutput);
    if (!primary || primary.trim().length === 0) {
      return {
        valid: false,
        code: null,
        error: "Code fence block was empty.",
        blocks
      };
    }

    // Detect placeholder comments and lazy stubs that local models frequently emit when incomplete
    const placeholderRegex = /(\/\/\s*\.\.\.\s*existing\s*code|\/\*\s*\.\.\.\s*existing|\/\/\s*rest\s*of\s*code|\/\/\s*\.\.\.\s*rest\s*of\s*code|\/\/\s*TODO:\s*(?:implement|fill|add|later)|throw\s+new\s+Error\(\s*["'](?:Not implemented|TODO)["']\s*\))/i;
    if (placeholderRegex.test(primary)) {
      return {
        valid: false,
        code: null,
        error: "Forbidden placeholder comment detected (e.g. '// ... existing code ...' or incomplete stub). You must rewrite the FULL file with all imports, functions, classes, and complete implementations included without placeholders.",
        blocks
      };
    }

    return {
      valid: true,
      code: primary,
      blocks
    };
  }

  /**
   * Generates a corrective follow-up prompt injecting the exact parser error.
   */
  public buildCorrectionPrompt(validationError: string): string {
    return [
      "[PARSER ERROR DETECTED - CORRECTION REQUIRED]:",
      `Your previous response failed structural validation with the following error:`,
      `> ${validationError}`,
      "",
      "Please immediately correct this mistake and resend your complete code output.",
      "Rules reminder:",
      "- Enclose the complete code inside a standard markdown code block: ```<language> ... ```.",
      "- Include ALL existing code and imports. Do NOT use placeholder comments like '// ... existing code ...'.",
      "- Do NOT output any <think> tags or internal thoughts. Start your response directly with the markdown code fence ```."
    ].join("\n");
  }

  /**
   * Executes inference with automatic self-healing retry loop.
   */
  public async executeWithSelfHealing(
    provider: IInferenceProvider,
    baseRequest: InferenceRequest,
    onChunk?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<{
    readonly code: string;
    readonly attempts: number;
    readonly rawOutput: string;
    readonly tokensPerSec: number;
    readonly tokensPrompt: number;
    readonly tokensCompletion: number;
  }> {
    const messages: ChatMessage[] = [...baseRequest.messages];
    const isReasoner = baseRequest.model.includes("r1") || baseRequest.model.includes("reasoner");
    const allowedRetries = isReasoner ? 1 : this.maxRetries;
    let attempts = 0;

    while (attempts < allowedRetries) {
      if (signal?.aborted) {
        throw new Error("Self-healing execution aborted by watchdog signal");
      }
      attempts++;
      const req: InferenceRequest = {
        ...baseRequest,
        messages,
        ...(signal ? { signal } : {})
      };
      const response = onChunk
        ? await provider.stream(req, onChunk)
        : await provider.generate(req);

      const validation = this.validate(response.content);
      if (validation.valid && validation.code) {
        return {
          code: validation.code,
          attempts,
          rawOutput: response.content,
          tokensPerSec: response.tokensPerSec,
          tokensPrompt: response.tokensPrompt,
          tokensCompletion: response.tokensCompletion
        };
      }

      if (signal?.aborted) {
        throw new Error("Self-healing execution aborted by watchdog signal");
      }

      // Append assistant invalid output and corrective user feedback
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: this.buildCorrectionPrompt(validation.error || "Invalid format.")
      });
    }

    throw new Error(`Self-healing parsing failed after ${this.maxRetries} attempts.`);
  }
}
