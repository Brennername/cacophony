import type { FunctionBoundary } from "@cacophony/shared-types";

export interface CommentPromptOptions {
  boundary: FunctionBoundary;
  functionBodyText: string;
  previousDraft?: string | undefined;
  userGuidance?: string | undefined;
}

export interface PromptPayload {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Factory that generates constrained prompts for function doc-comment synthesis and interactive rerolls.
 * Strictly prevents file edits and instructs the model to output solely JSDoc/TSDoc commentary.
 */
export class CommentRerollPromptFactory {
  public static readonly SYSTEM_PROMPT = [
    "You are an expert software architect and technical documentation specialist.",
    "Your SOLE purpose is to write clear, accurate, and concise JSDoc / TSDoc function comments.",
    "CRITICAL CONSTRAINTS:",
    "1. You MUST output ONLY the JSDoc/TSDoc comment block (starting with /** and ending with */).",
    "2. You CANNOT and MUST NOT edit, reproduce, or output any function implementation code.",
    "3. Do NOT wrap your output in markdown code fences (```).",
    "4. Explain the 'why' and architectural decoupling, parameter expectations, and return values.",
    "5. Do NOT use promotional fluff, emojis, or generic boilerplate."
  ].join("\n");

  /**
   * Builds the system and user prompts for function doc generation or reroll.
   */
  public static createPrompt(options: CommentPromptOptions): PromptPayload {
    const { boundary, functionBodyText, previousDraft, userGuidance } = options;

    const paramLines = boundary.parameters.map((p) => {
      const typeStr = p.type ? ` (${p.type})` : "";
      const defaultStr = p.defaultValue ? ` [default: ${p.defaultValue}]` : "";
      return `  - ${p.name}${typeStr}${defaultStr}`;
    }).join("\n");

    const sections: string[] = [
      `Target Function: ${boundary.name}`,
      `Scope Kind: ${boundary.scopeKind}`,
      `Signature: ${boundary.signature}`,
      paramLines ? `Parameters:\n${paramLines}` : "Parameters: None",
      boundary.returnType ? `Return Type: ${boundary.returnType}` : "",
      "",
      "--- Function Implementation Body ---",
      functionBodyText.slice(0, 4000),
      "--- End Implementation ---",
    ];

    if (previousDraft) {
      sections.push(
        "",
        "--- Previous Draft Variant ---",
        previousDraft,
        "--- End Previous Draft ---",
      );
    }

    if (userGuidance) {
      sections.push(
        "",
        "--- Operator Reroll Revision Guidance ---",
        `Guidance: ${userGuidance}`,
        "Address the operator's feedback directly (e.g. reduce fluff, emphasize architectural decoupling, clarify edge cases).",
        "--- End Guidance ---",
      );
    }

    sections.push(
      "",
      "Output strictly the JSDoc comment block now:"
    );

    return {
      systemPrompt: CommentRerollPromptFactory.SYSTEM_PROMPT,
      userPrompt: sections.filter(Boolean).join("\n"),
    };
  }
}
