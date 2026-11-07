import crypto from "node:crypto";
import type { IInferenceProvider } from "./IInferenceProvider.js";
import { CommentRerollPromptFactory } from "./CommentRerollPromptFactory.js";
import { FunctionAstLocator } from "../ast/FunctionAstLocator.js";
import { ModelRoleSelector } from "../scheduler/ModelRoleSelector.js";
import type { DocCommentCandidate } from "@cacophony/shared-types";

export interface SynthesizeDocOptions {
  filePath: string;
  functionName: string;
  sourceContent: string;
  previousDraft?: string | undefined;
  userGuidance?: string | undefined;
  preferredModel?: string | undefined;
}

/**
 * Service that orchestrates constrained local model documentation generation
 * and interactive rerolls for functions.
 */
export class FunctionDocSynthesizer {
  constructor(
    private readonly inferenceProvider: IInferenceProvider,
    private readonly astLocator = new FunctionAstLocator(),
    private readonly roleSelector = new ModelRoleSelector(),
  ) {}

  /**
   * Generates or rerolls a function documentation comment.
   */
  public async synthesizeDocComment(options: SynthesizeDocOptions): Promise<DocCommentCandidate> {
    const { filePath, functionName, sourceContent, previousDraft, userGuidance, preferredModel } = options;

    const boundary = this.astLocator.findFunctionByName(sourceContent, functionName, filePath);
    if (!boundary) {
      throw new Error(`Target function '${functionName}' not found in AST of '${filePath}'.`);
    }

    const functionBodyText = sourceContent.slice(boundary.startPos, boundary.endPos);
    const prompts = CommentRerollPromptFactory.createPrompt({
      boundary,
      functionBodyText,
      previousDraft,
      userGuidance,
    });

    const model =
      preferredModel ||
      this.roleSelector.selectModelForRole("function_commenter", [
        "qwen2.5-coder:7b-instruct-q4_K_M",
        "deepseek-coder-v2:16b",
        "phi4:latest",
        "gemma3:4b",
      ]);

    const response = await this.inferenceProvider.generate({
      model,
      messages: [
        { role: "system", content: prompts.systemPrompt },
        { role: "user", content: prompts.userPrompt },
      ],
      temperature: 0.2,
    });

    const candidateText = this.sanitizeDocCommentOutput(response.content);

    return {
      id: `doc-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      functionIdentifier: functionName,
      filePath,
      candidateText,
      userGuidance,
      status: "PENDING",
      modelId: model,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Sanitizes model output to ensure standard JSDoc block delimiters.
   */
  public sanitizeDocCommentOutput(raw: string): string {
    let text = raw.trim();

    // Strip markdown code fences if model hallucinated them
    text = text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();

    // Find first /** and last */
    const startIdx = text.indexOf("/**");
    const endIdx = text.lastIndexOf("*/");

    if (startIdx !== -1 && endIdx > startIdx) {
      return text.slice(startIdx, endIdx + 2).trim();
    }

    // If missing leading /**, wrap cleanly
    const lines = text.split("\n").map((l) => {
      const stripped = l.trim().replace(/^\*\s?/, "");
      return ` * ${stripped}`;
    });

    return ["/**", ...lines, " */"].join("\n");
  }
}
