import { AstValidator, type AstValidationResult } from "../scrubber/AstValidator.js";

/**
 * Options required to configure a slot-fill prompt for code synthesis.
 */
export interface ISlotFillPromptOptions {
  readonly targetFile: string;
  readonly targetSymbol: string;
  readonly methodSignature: string;
  readonly scaffoldContent: string;
  readonly taskDescription?: string;
  readonly returnType?: string;
  readonly parameterList?: readonly string[];
  readonly importsHeader?: string;
}

/**
 * Represents the structured slot-fill prompt payload.
 */
export interface ISlotFillPromptPayload {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly targetSymbol: string;
  readonly beginMarker: string;
  readonly endMarker: string;
}

/**
 * SlotFillPromptBuilder
 *
 * Implements Phase 70 (T70.2.3 & T70.2.4) by bounding model generation
 * strictly within defined function slot markers. Prevents hallucination
 * of entire files, imports, or duplicate class declarations by constraining
 * output to the body between // <BEGIN_IMPLEMENTATION> and // <END_IMPLEMENTATION>.
 */
export class SlotFillPromptBuilder {
  public static readonly BEGIN_MARKER = "// <BEGIN_IMPLEMENTATION>";
  public static readonly END_MARKER = "// <END_IMPLEMENTATION>";

  private readonly validator: AstValidator;

  constructor(private readonly options: ISlotFillPromptOptions) {
    this.validator = new AstValidator();
  }

  /**
   * Generates the structured prompt instructing the model to generate
   * strictly the slot body between the predefined markers.
   */
  public buildPrompt(): ISlotFillPromptPayload {
    const {
      targetFile,
      targetSymbol,
      methodSignature,
      scaffoldContent,
      taskDescription,
    } = this.options;

    const systemPrompt = [
      "You are a deterministic code generation agent.",
      `Target File: ${targetFile}`,
      `Target Symbol: ${targetSymbol}`,
      "Rules:",
      "1. Generate ONLY the code body for the specified method slot.",
      "2. Wrap your implementation between the exact markers:",
      `   ${SlotFillPromptBuilder.BEGIN_MARKER}`,
      `   // your code here`,
      `   ${SlotFillPromptBuilder.END_MARKER}`,
      "3. Do NOT emit Markdown code fences, file headers, import statements, or class wrappers.",
      "4. Adhere strictly to TypeScript types and avoid using 'any' or '// @ts-ignore'.",
    ].join("\n");

    const userPrompt = [
      `Task: Implement method '${targetSymbol}' in '${targetFile}'.`,
      taskDescription ? `Context: ${taskDescription}` : "",
      `Method Signature: ${methodSignature}`,
      "",
      "Scaffold Context:",
      scaffoldContent,
      "",
      `Generate the implementation between ${SlotFillPromptBuilder.BEGIN_MARKER} and ${SlotFillPromptBuilder.END_MARKER}:`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      systemPrompt,
      userPrompt,
      targetSymbol,
      beginMarker: SlotFillPromptBuilder.BEGIN_MARKER,
      endMarker: SlotFillPromptBuilder.END_MARKER,
    };
  }

  /**
   * Extracts the slot implementation body from the raw LLM output.
   * Tolerates surrounding Markdown code fences if the model emits them.
   */
  public extractSlotBody(rawResponse: string): string {
    const beginMarker = SlotFillPromptBuilder.BEGIN_MARKER;
    const endMarker = SlotFillPromptBuilder.END_MARKER;

    const beginIdx = rawResponse.indexOf(beginMarker);
    const endIdx = rawResponse.indexOf(endMarker);

    if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
      return rawResponse
        .slice(beginIdx + beginMarker.length, endIdx)
        .trim();
    }

    // Fallback: strip markdown code blocks if the model wrapped output
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, "");
      cleaned = cleaned.replace(/\n?```\s*$/, "");
    }

    // Strip markers if partially present
    cleaned = cleaned.replace(beginMarker, "").replace(endMarker, "").trim();

    return cleaned;
  }

  /**
   * Synthesizes the extracted slot body into the host scaffold.
   * If scaffold contains the slot markers, replaces the contents between them.
   * Alternatively supports replacing AST_METHOD_STUB comments.
   */
  public synthesize(slotBody: string): string {
    const scaffold = this.options.scaffoldContent;
    const beginMarker = SlotFillPromptBuilder.BEGIN_MARKER;
    const endMarker = SlotFillPromptBuilder.END_MARKER;

    const beginIdx = scaffold.indexOf(beginMarker);
    const endIdx = scaffold.indexOf(endMarker);

    if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
      const before = scaffold.slice(0, beginIdx + beginMarker.length);
      const after = scaffold.slice(endIdx);
      return `${before}\n${slotBody}\n${after}`;
    }

    // Fallback to stub replacement
    const stubPattern = new RegExp(
      `\\/\\*\\s*AST_METHOD_STUB:\\s*${this.options.targetSymbol}\\s*\\*\\/`,
      "g",
    );
    if (stubPattern.test(scaffold)) {
      return scaffold.replace(stubPattern, slotBody);
    }

    return scaffold;
  }

  /**
   * Validates both the isolated slot body and the synthesized final source file.
   */
  public validate(slotBody: string): AstValidationResult {
    // 1. Validate isolated slot body
    const slotCheck = this.validator.validateSlotFillIntegrity(
      slotBody,
      this.options.targetFile,
    );
    if (!slotCheck.valid) {
      return slotCheck;
    }

    // 2. Synthesize and validate full file AST
    const synthesized = this.synthesize(slotBody);
    return this.validator.validateTypeScript(
      synthesized,
      this.options.targetFile,
    );
  }
}
