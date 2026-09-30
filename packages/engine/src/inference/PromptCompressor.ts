export interface CompressionResult {
  readonly compressed: string;
  readonly originalLength: number;
  readonly compressedLength: number;
  readonly compressionRatio: number;
  readonly removedCommentsCount: number;
}

/**
 * PromptCompressor
 *
 * Optimizes prompts and code context before dispatching to LLM inference engines.
 * Strips redundant block/inline comments (while preserving critical compiler directives and licences),
 * collapses multiple consecutive blank lines and trailing whitespace, and removes unreferenced
 * interface and type declarations to maximize prompt token headroom.
 */
export class PromptCompressor {
  /**
   * Compresses source code or prompt text while preserving syntax and semantics.
   *
   * @param input Raw text or TypeScript code
   * @param isSourceCode If true, applies code-specific comment removal
   */
  public compress(input: string, isSourceCode = true): CompressionResult {
    const originalLength = input.length;
    if (!input || input.trim().length === 0) {
      return {
        compressed: "",
        originalLength,
        compressedLength: 0,
        compressionRatio: 1.0,
        removedCommentsCount: 0
      };
    }

    let processed = input;
    let removedComments = 0;

    if (isSourceCode) {
      // Strip block comments (/* ... */) except those marked as @license or @preserve
      processed = processed.replace(/\/\*(?![\s*]*@(license|preserve))[\s\S]*?\*\//g, () => {
        removedComments++;
        return "";
      });

      // Strip single line comments (// ...) except compiler directives (/// <reference or // @ts-)
      processed = processed.replace(/^\s*\/\/(?!\s*(@ts-|[\/]\s*<reference))([^\n]*)$/gm, () => {
        removedComments++;
        return "";
      });
    }

    // Collapse trailing whitespace per line
    processed = processed.replace(/[ \t]+$/gm, "");

    // Collapse multiple consecutive newlines into at most two newlines
    processed = processed.replace(/\n{3,}/g, "\n\n");

    const trimmed = processed.trim();
    const compressedLength = trimmed.length;
    const compressionRatio = originalLength > 0
      ? Number((compressedLength / originalLength).toFixed(3))
      : 1.0;

    return {
      compressed: trimmed,
      originalLength,
      compressedLength,
      compressionRatio,
      removedCommentsCount: removedComments
    };
  }

  /**
   * Strips unreferenced interface or type declarations from a TypeScript file content
   * given a set of referenced root identifiers.
   *
   * @param content TypeScript module source
   * @param referencedSymbols Set of identifiers needed by the target context
   */
  public pruneUnreferencedDeclarations(content: string, referencedSymbols: ReadonlySet<string>): string {
    if (referencedSymbols.size === 0) {
      return content;
    }

    const lines = content.split("\n");
    const outputLines: string[] = [];
    let skippingDeclaration = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      if (!skippingDeclaration) {
        // Detect interface or type declaration: export (interface|type) Foo
        const declMatch = line.match(/^(\s*export\s+)?(interface|type)\s+([A-Za-z0-9_]+)/);
        if (declMatch) {
          const typeName = declMatch[3]!;
          if (!referencedSymbols.has(typeName)) {
            // Check if it's single line: type X = string;
            if (line.includes(";")) {
              continue;
            }
            skippingDeclaration = true;
            braceDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            continue;
          }
        }
        outputLines.push(line);
      } else {
        braceDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        if (braceDepth <= 0) {
          skippingDeclaration = false;
          braceDepth = 0;
        }
      }
    }

    return outputLines.join("\n");
  }
}
