/**
 * Extracted code block from an LLM markdown response.
 */
export interface ExtractedCodeBlock {
  readonly language: string;
  readonly code: string;
  readonly targetFile?: string;
  readonly isTruncated?: boolean;
}

/**
 * AdaptiveOutputFormatter
 *
 * Implements the Adaptive Output Formatting strategy from the Technical Design Document:
 * - Local Models: Enforces whole-file rewrites. Because resource-constrained models struggle with
 *   fine-grained search-and-replace diff syntax, prompts explicitly demand the complete file content
 *   enclosed in standard markdown code blocks.
 * - Frontier Models: Permits concise structural diffs or targeted code blocks to minimize token overhead.
 */
export function stripThinkBlocks(text: string): string {
  let result = "";
  let cursor = 0;
  const lower = text.toLowerCase();
  while (cursor < text.length) {
    const startIdx = lower.indexOf("<think>", cursor);
    if (startIdx === -1) {
      result += text.slice(cursor);
      break;
    }
    result += text.slice(cursor, startIdx);
    const endIdx = lower.indexOf("</think>", startIdx + 7);
    if (endIdx === -1) {
      break;
    }
    cursor = endIdx + 8;
  }
  return result;
}

export class AdaptiveOutputFormatter {
  /**
   * Generates output format instruction directives tailored to model tier and archetype.
   */
  public getFormatInstruction(
    isLocalModel: boolean,
    focusFile?: string,
    modelTag?: string,
    isLargeExistingFile?: boolean
  ): string {
    if (isLocalModel) {
      const fileTarget = focusFile ? ` for file '${focusFile}'` : "";
      const isReasoner = modelTag ? (
        modelTag.toLowerCase().includes("r1") ||
        modelTag.toLowerCase().includes("think") ||
        modelTag.toLowerCase().includes("reason")
      ) : false;

      if (isLargeExistingFile) {
        const lines = [
          "[OUTPUT FORMAT REQUIREMENT - TARGETED CLASS / METHOD EXTENSION]:",
          `File '${focusFile}' is a large existing module (> 250 lines). Do NOT output a full rewrite of the file.`,
          "Output a valid TypeScript class declaration containing ONLY:",
          "1. Any required import statements.",
          "2. The target class containing ONLY the new or updated methods/properties required for this task.",
          "Existing unchanged methods and class members will be automatically merged via AST analysis.",
          "Enclose the implementation inside a single standard markdown code block: ```typescript ... ```."
        ];

        if (isReasoner) {
          lines.push(
            "CRITICAL: Keep internal thinking brief. Once </think> is closed, do NOT open another <think> block. Immediately emit the markdown code fence with the targeted implementation."
          );
        } else {
          lines.push(
            "Your response should be only the code block or brief explanation followed by the code block. Do NOT emit <think> or </think> tags."
          );
        }

        return lines.join("\n");
      }

      const lines = [
        "[OUTPUT FORMAT REQUIREMENT - WHOLE FILE REWRITE]:",
        `Provide the COMPLETE, fully working file content${fileTarget}.`,
        "Do NOT use diffs, search/replace blocks, ellipses, or placeholder comments (e.g. '// ... existing code ...').",
        "Enclose the entire code inside a single standard markdown code block: ```<language> ... ```."
      ];

      if (isReasoner) {
        lines.push(
          "CRITICAL: Keep internal thinking brief. Once </think> is closed, do NOT open another <think> block. Immediately emit the markdown code fence with the complete implementation."
        );
      } else {
        lines.push(
          "Your response should be only the code block or brief explanation followed by the code block. Do NOT emit <think> or </think> tags."
        );
      }

      return lines.join("\n");
    }

    // Frontier model instructions
    return [
      "[OUTPUT FORMAT REQUIREMENT]:",
      "Provide complete file contents or clear structural replacement blocks within standard markdown code fences (```<language> ... ```).",
      "Ensure all code is valid, syntax-checked, and self-contained."
    ].join("\n");
  }

  /**
   * Extracts code blocks from raw LLM output, parsing language and content.
   */
  public extractCodeBlocks(rawContent: string): readonly ExtractedCodeBlock[] {
    const blocks: ExtractedCodeBlock[] = [];
    if (!rawContent) return blocks;

    // Normalize: strip all closed reasoning blocks <think>...</think>
    let cleaned = stripThinkBlocks(rawContent).trim();

    // If an unclosed <think> tag remains (e.g. model truncated or emitted another <think>),
    // strip the unclosed trailing block while preserving any prior generated text
    const unclosedThinkIdx = cleaned.indexOf("<think>");
    if (unclosedThinkIdx !== -1) {
      cleaned = cleaned.slice(0, unclosedThinkIdx).trim();
    }

    // Strip any orphan </think> or <think> tags emitted by confused or non-reasoning models
    cleaned = cleaned.replace(/<\/?think>/gi, "").trim();

    // If all content was inside think tags but code fences exist inside, extract from rawContent
    if (!cleaned && rawContent.includes("```")) {
      cleaned = rawContent;
    }

    let cursor = 0;
    while (cursor < cleaned.length) {
      const openIdx = cleaned.indexOf("```", cursor);
      if (openIdx === -1) break;

      let lineEnd = cleaned.indexOf("\n", openIdx + 3);
      if (lineEnd === -1) lineEnd = cleaned.length;
      const langHeader = cleaned.slice(openIdx + 3, lineEnd).trim();
      const language = /^[a-zA-Z0-9_-]+$/.test(langHeader) ? langHeader : "text";

      const closeIdx = cleaned.indexOf("```", lineEnd);
      if (closeIdx === -1) {
        // Fallback: If no closing ``` was found, handle truncated response
        const unclosedCode = cleaned.slice(lineEnd).trim();
        if (blocks.length === 0 && unclosedCode.length > 0) {
          blocks.push({
            language,
            code: unclosedCode,
            isTruncated: true
          });
        }
        break;
      }

      const code = cleaned.slice(lineEnd, closeIdx).trim();
      if (code.length > 0) {
        if (code.includes("```")) {
          const innerBlocks = this.extractCodeBlocks(code);
          if (innerBlocks.length > 0) {
            blocks.push(...innerBlocks);
            cursor = closeIdx + 3;
            continue;
          }
        }
        blocks.push({ language, code });
      }
      cursor = closeIdx + 3;
    }

    return blocks;
  }

  /**
   * Extracts the primary code content, prioritizing the longest valid block if multiple fences exist.
   */
  public extractPrimaryCode(rawContent: string): string | null {
    const blocks = this.extractCodeBlocks(rawContent);
    if (blocks.length === 0) return null;

    // Pick the longest code block (avoids introductory snippets or commands)
    const sorted = [...blocks].sort((a, b) => b.code.length - a.code.length);
    return sorted[0]!.code;
  }
}
