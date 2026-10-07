import ts from "typescript";
import { HashStubGenerator } from "./HashStubGenerator.js";

export interface SpliceResult {
  readonly updatedCode: string;
  readonly spliced: boolean;
  readonly methodName?: string | undefined;
}

/**
 * HashStubMethodSplicer
 *
 * Uses AST inspection to locate the class method containing a targeted
 * collision-free hash-stub comment (or matching method name) and splices in
 * the verified method body without formatting corruption or line drift.
 */
export class HashStubMethodSplicer {
  /**
   * Splices a replacement method declaration into source code by locating its hash anchor.
   */
  public static splice(
    sourceCode: string,
    targetHash: string,
    replacementMethodCode: string
  ): SpliceResult {
    const stubs = HashStubGenerator.extractStubs(sourceCode);
    const targetStub = stubs.find(
      (s) => s.hash === targetHash || s.methodName === targetHash
    );

    if (!targetStub) {
      return { updatedCode: sourceCode, spliced: false };
    }

    const sourceFile = ts.createSourceFile(
      "temp.ts",
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    let methodNodeRange: { start: number; end: number } | null = null;
    let foundMethodName: string | undefined = targetStub.methodName;

    function visit(node: ts.Node): void {
      if (
        ts.isMethodDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isMethodSignature(node)
      ) {
        const fullText = sourceCode.slice(node.getFullStart(), node.getEnd());
        if (fullText.includes(targetStub!.commentTag)) {
          methodNodeRange = {
            start: node.getStart(sourceFile),
            end: node.getEnd(),
          };
          const nameText = node.name?.getText(sourceFile);
          if (nameText) foundMethodName = nameText;
          return;
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    if (!methodNodeRange) {
      // Fallback: string substitution around target comment
      const commentIndex = sourceCode.indexOf(targetStub.commentTag);
      if (commentIndex >= 0) {
        // Find enclosing method start and end braces
        const before = sourceCode.lastIndexOf("public ", commentIndex);
        const after = sourceCode.indexOf("}", commentIndex);
        if (before >= 0 && after > commentIndex) {
          const updated =
            sourceCode.slice(0, before) +
            replacementMethodCode.trim() +
            sourceCode.slice(after + 1);
          return {
            updatedCode: updated,
            spliced: true,
            methodName: foundMethodName,
          };
        }
      }
      return { updatedCode: sourceCode, spliced: false };
    }

    const range = methodNodeRange as { start: number; end: number };
    const cleanReplacement = replacementMethodCode.trim();

    const updatedCode =
      sourceCode.slice(0, range.start) +
      cleanReplacement +
      sourceCode.slice(range.end);

    return {
      updatedCode,
      spliced: true,
      methodName: foundMethodName,
    };
  }
}
