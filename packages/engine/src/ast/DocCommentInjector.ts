import { FunctionAstLocator } from "./FunctionAstLocator.js";
import type { DocCommentInjectionResult, FunctionBoundary } from "@cacophony/shared-types";

/**
 * Service that injects synthesized JSDoc / TSDoc comments directly above target
 * function declarations. Strictly enforces non-destructive invariants:
 * the function body and implementation code cannot be altered, replaced, or deleted.
 */
export class DocCommentInjector {
  constructor(private readonly astLocator = new FunctionAstLocator()) {}

  /**
   * Formats and injects a doc comment above the specified function in the source content.
   *
   * @param sourceContent Source code of the target file
   * @param functionIdentifier Name of the function to comment
   * @param rawDocComment JSDoc comment text to inject
   * @param filePath File path for AST resolution
   * @returns Result indicating success, modified source content, and injected line position
   */
  public injectDocComment(
    sourceContent: string,
    functionIdentifier: string,
    rawDocComment: string,
    filePath = "source.ts",
  ): DocCommentInjectionResult {
    const target = this.astLocator.findFunctionByName(sourceContent, functionIdentifier, filePath);
    if (!target) {
      return {
        success: false,
        filePath,
        injectedAtLine: 0,
        modifiedContent: sourceContent,
        error: `Target function '${functionIdentifier}' not found in AST.`,
      };
    }

    const formattedComment = this.normalizeDocComment(rawDocComment, target.leadingIndent);

    // Extract pre-injection function body for safety assertion
    const originalBody = this.extractFunctionBody(sourceContent, target);

    // Locate injection point: replace existing JSDoc if present, or insert directly above function
    let modifiedContent: string;
    let injectedLine = target.startLine;

    const lines = sourceContent.split("\n");
    const targetLineIdx = target.startLine - 1;

    // Check if previous lines contain an existing JSDoc block to replace
    let commentStartLineIdx = targetLineIdx;
    let hasExistingDoc = false;

    // Look backwards from target line to see if an immediate JSDoc block precedes it
    let checkIdx = targetLineIdx - 1;
    while (checkIdx >= 0 && lines[checkIdx]?.trim() === "") {
      checkIdx--;
    }

    if (checkIdx >= 0 && lines[checkIdx]?.trim().endsWith("*/")) {
      let blockStart = checkIdx;
      while (blockStart >= 0 && !lines[blockStart]?.includes("/**")) {
        blockStart--;
      }
      if (blockStart >= 0 && lines[blockStart]?.includes("/**")) {
        commentStartLineIdx = blockStart;
        hasExistingDoc = true;
      }
    }

    if (hasExistingDoc) {
      // Replace existing doc block from commentStartLineIdx to checkIdx
      const before = lines.slice(0, commentStartLineIdx);
      const after = lines.slice(checkIdx + 1);
      modifiedContent = [...before, formattedComment, ...after].join("\n");
      injectedLine = commentStartLineIdx + 1;
    } else {
      // Prepend doc comment directly before the function declaration
      const before = lines.slice(0, targetLineIdx);
      const after = lines.slice(targetLineIdx);
      modifiedContent = [...before, formattedComment, ...after].join("\n");
      injectedLine = targetLineIdx + 1;
    }

    // Post-injection safety verification: locate target function in modified AST and assert body preservation
    const postTarget = this.astLocator.findFunctionByName(modifiedContent, functionIdentifier, filePath);
    if (!postTarget) {
      return {
        success: false,
        filePath,
        injectedAtLine: 0,
        modifiedContent: sourceContent,
        error: "AST verification failed: function declaration could not be located after comment injection.",
      };
    }

    const postBody = this.extractFunctionBody(modifiedContent, postTarget);
    if (originalBody !== postBody) {
      return {
        success: false,
        filePath,
        injectedAtLine: 0,
        modifiedContent: sourceContent,
        error: "Safety invariant violated: function body was altered during doc comment injection.",
      };
    }

    return {
      success: true,
      filePath,
      injectedAtLine: injectedLine,
      modifiedContent,
    };
  }

  /**
   * Normalizes raw LLM output or doc strings into clean, indented JSDoc formatting.
   */
  public normalizeDocComment(raw: string, indent: string): string {
    const cleaned = raw
      .replace(/^```[a-z]*\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    // If already properly wrapped in /** ... */
    if (cleaned.startsWith("/**") && cleaned.endsWith("*/")) {
      const commentLines = cleaned.split("\n");
      return commentLines
        .map((line, idx) => {
          const trimmed = line.trim();
          if (idx === 0) {
            return `${indent}${trimmed}`;
          }
          if (trimmed.startsWith("*")) {
            return `${indent} ${trimmed}`;
          }
          return `${indent} * ${trimmed}`;
        })
        .join("\n");
    }

    // Wrap plain text comment into standard JSDoc block
    const innerLines = cleaned.split("\n").map((line) => {
      const stripped = line.replace(/^\s*\*\s?/, "");
      return `${indent} * ${stripped}`;
    });

    return [`${indent}/**`, ...innerLines, `${indent} */`].join("\n");
  }

  private extractFunctionBody(content: string, boundary: FunctionBoundary): string {
    const text = content.slice(boundary.startPos, boundary.endPos);
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return text.slice(firstBrace, lastBrace + 1).trim();
    }
    return text.trim();
  }
}
