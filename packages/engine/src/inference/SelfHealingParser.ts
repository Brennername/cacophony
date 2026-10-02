import { AdaptiveOutputFormatter, type ExtractedCodeBlock } from "./AdaptiveOutputFormatter.js";
import type { IInferenceProvider } from "./IInferenceProvider.js";
import type { ChatMessage, InferenceRequest } from "@cacophony/shared-types";

export interface ParseValidationResult {
  readonly valid: boolean;
  readonly code: string | null;
  readonly error?: string;
  readonly blocks: readonly ExtractedCodeBlock[];
}

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

      const lastOpenThink = rawOutput.lastIndexOf("");

      if (lastOpenThink !== -1 && (lastCloseThink === -1 || lastOpenThink > lastCloseThink)) {
        return {
          valid: false,
          code: null,
          error: "Output was cut off inside a thinking block (") && !rawOutput.includes("