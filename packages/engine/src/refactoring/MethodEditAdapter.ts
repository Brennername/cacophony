import ts from "typescript";
import { TypeScriptMethodSplicer } from "./TypeScriptMethodSplicer.js";

export interface ApplyMethodEditOptions {
  readonly source: string;
  readonly fileName: string;
  readonly className: string;
  readonly methodName: string;
  readonly newBodyOrCompletion: string;
}

export interface MethodEditResult {
  readonly success: boolean;
  readonly splicedSource: string;
  readonly className: string;
  readonly methodName: string;
  readonly bytesReplaced: number;
  readonly error?: string | undefined;
}

/**
 * MethodEditAdapter
 *
 * Prevents whole-file regeneration and hallucination loops by enforcing AST-validated
 * single-method replacement. Intercepts method completions, extracts the method body,
 * validates target AST existence, and splices the change with complete file syntax checks.
 */
export class MethodEditAdapter {
  /**
   * Applies an AST-validated method replacement to a source file.
   */
  public static applyMethodEdit(
    options: ApplyMethodEditOptions,
  ): MethodEditResult {
    const { source, fileName, className, methodName, newBodyOrCompletion } = options;

    try {
      // 1. Verify that target class and method exist in AST
      const validation = TypeScriptMethodSplicer.validateTarget(
        source,
        fileName,
        className,
        methodName,
      );

      if (!validation.valid || validation.bodyStart === undefined || validation.bodyEnd === undefined) {
        return {
          success: false,
          splicedSource: source,
          className,
          methodName,
          bytesReplaced: 0,
          error: validation.reason || `Target ${className}.${methodName} validation failed`,
        };
      }

      // 2. Extract method body from completion, gracefully stripping accidental class/method wrappers
      const extractedBody = this.extractMethodBody(newBodyOrCompletion, methodName);

      // 3. Splice method body into source
      const splicedSource = TypeScriptMethodSplicer.spliceMethod(
        source,
        fileName,
        className,
        methodName,
        extractedBody,
      );

      // 4. Validate complete spliced file syntax
      const finalAst = ts.createSourceFile(
        fileName,
        splicedSource,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );

      const diagnostics =
        (finalAst as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] })
          .parseDiagnostics ?? [];

      if (diagnostics.length > 0) {
        const firstError = diagnostics[0]!.messageText.toString();
        return {
          success: false,
          splicedSource: source,
          className,
          methodName,
          bytesReplaced: 0,
          error: `Resulting file has syntax errors after method splice: ${firstError}`,
        };
      }

      const bytesReplaced = validation.bodyEnd - validation.bodyStart;

      return {
        success: true,
        splicedSource,
        className,
        methodName,
        bytesReplaced,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        splicedSource: source,
        className,
        methodName,
        bytesReplaced: 0,
        error: errorMsg,
      };
    }
  }

  /**
   * Cleans and extracts the pure method body from model generation, stripping markdown fences
   * and accidental class/method wrappers if present.
   */
  private static extractMethodBody(raw: string, methodName: string): string {
    let text = raw
      .replace(/^```(?:typescript|ts)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    // Check if the model generated a method signature wrapper: methodName(...) { ... }
    const methodRegex = new RegExp(
      `(?:public|private|protected|async|static|\\s)*\\b${methodName}\\s*\\([^)]*\\)[^{]*\\{([\\s\\S]*)\\}\\s*$`,
      "m",
    );
    const methodMatch = text.match(methodRegex);
    if (methodMatch && methodMatch[1]) {
      return methodMatch[1].trim();
    }

    // Check if the model generated a class wrapper: class ... { methodName(...) { ... } }
    if (text.includes("class ") && text.includes(methodName)) {
      const probeSource = ts.createSourceFile("wrapper-probe.ts", text, ts.ScriptTarget.Latest, true);
      let foundBody: string | null = null;
      const visit = (node: ts.Node): void => {
        if (
          ts.isMethodDeclaration(node) &&
          node.name &&
          ts.isIdentifier(node.name) &&
          node.name.text === methodName &&
          node.body
        ) {
          foundBody = node.body.getText(probeSource);
          return;
        }
        ts.forEachChild(node, visit);
      };
      visit(probeSource);
      if (foundBody) {
        const trimmed = (foundBody as string).trim();
        return trimmed.startsWith("{") && trimmed.endsWith("}")
          ? trimmed.slice(1, -1).trim()
          : trimmed;
      }
    }

    return text;
  }
}
