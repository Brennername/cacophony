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

  constructor(formatter: AdaptiveOutputFormatter = new AdaptiveOutputFormatter(), maxRetries = 3) {
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

    // Detect placeholder comments that local models frequently use when lazy
    const placeholderRegex = /(\/\/\s*\.\.\.\s*existing\s*code|\/\*\s*\.\.\.\s*existing|\/\/\s*rest\s*of\s*code)/i;
    if (placeholderRegex.test(primary)) {
      return {
        valid: false,
        code: null,
        error: "Forbidden placeholder comment detected (e.g. '// ... existing code ...'). You must rewrite the FULL file with all imports, functions, and classes included.",
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
      "- Include ALL existing code and imports. Do NOT use placeholder comments like '// ... existing code ...'."
    ].join("\n");
  }

  /**
   * Executes inference with automatic self-healing retry loop.
   */
  public async executeWithSelfHealing(
    provider: IInferenceProvider,
    baseRequest: InferenceRequest,
    onChunk?: (chunk: string) => void
  ): Promise<{ readonly code: string; readonly attempts: number; readonly rawOutput: string }> {
    const messages: ChatMessage[] = [...baseRequest.messages];
    let attempts = 0;

    while (attempts < this.maxRetries) {
      attempts++;
      const response = onChunk
        ? await provider.stream({ ...baseRequest, messages }, onChunk)
        : await provider.generate({ ...baseRequest, messages });

      const validation = this.validate(response.content);
      if (validation.valid && validation.code) {
        return {
          code: validation.code,
          attempts,
          rawOutput: response.content
        };
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
