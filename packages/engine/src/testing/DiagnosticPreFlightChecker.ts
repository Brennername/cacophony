import ts from "typescript";

export interface PreFlightDiagnostic {
  readonly line: number;
  readonly character: number;
  readonly message: string;
  readonly code: number;
  readonly category: "error" | "warning" | "message" | "suggestion";
}

export interface DiagnosticPreFlightResult {
  readonly isValid: boolean;
  readonly diagnostics: readonly PreFlightDiagnostic[];
  readonly rawErrorSummary?: string | undefined;
}

/**
 * DiagnosticPreFlightChecker
 *
 * Provides sub-millisecond in-memory syntax verification for generated and
 * remediated code blocks prior to dispatching expensive test runner subprocesses (T63.6.1).
 *
 * Utilizes TypeScript compiler AST parsing and module transpilation diagnostics
 * in memory without disk I/O, instantly trapping syntax errors, malformed brackets,
 * and truncated expressions.
 */
export class DiagnosticPreFlightChecker {
  /**
   * Validates whether a candidate task object contains required structural fields.
   * Returns false without throwing if the input is null, non-object, or lacks an identifier.
   */
  public validateTask(task: unknown): boolean {
    if (!task || typeof task !== "object") {
      return false;
    }
    const candidate = task as Record<string, unknown>;
    if (typeof candidate.id !== "string" || candidate.id.trim().length === 0) {
      return false;
    }
    return true;
  }

  /**
   * Validates code syntax in-memory and returns structured diagnostics.
   *
   * @param code The TypeScript/JavaScript source code to inspect.
   * @param fileName Optional virtual filename for error location reporting.
   */
  public checkSyntax(
    code: string,
    fileName = "virtual_preflight.ts",
  ): DiagnosticPreFlightResult {
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return {
        isValid: false,
        diagnostics: [
          {
            line: 1,
            character: 1,
            message: "Source code is empty.",
            code: 0,
            category: "error",
          },
        ],
        rawErrorSummary: "Source code is empty.",
      };
    }

    try {
      // Strip ANSI escape sequences that might leak into code strings
      let sanitizedCode = code.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");

      // Strip enclosing markdown code block fences if present
      const trimmed = sanitizedCode.trim();
      if (trimmed.startsWith("```")) {
        sanitizedCode = trimmed
          .replace(/^```[a-zA-Z0-9_-]*\r?\n/, "")
          .replace(/\r?\n```$/, "");
      }

      const diagnostics: PreFlightDiagnostic[] = [];

      const sourceFile = ts.createSourceFile(
        fileName,
        sanitizedCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );

      const parseDiags =
        (sourceFile as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] })
          .parseDiagnostics ?? [];

      for (const diag of parseDiags) {
        const pos =
          diag.file && diag.start !== undefined
            ? diag.file.getLineAndCharacterOfPosition(diag.start)
            : { line: 0, character: 0 };

        const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");

        diagnostics.push({
          line: pos.line + 1,
          character: pos.character + 1,
          message,
          code: diag.code,
          category: this.mapCategory(diag.category),
        });
      }

      const transpileResult = ts.transpileModule(sanitizedCode, {
        fileName,
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          isolatedModules: true,
        },
      });

      if (transpileResult.diagnostics) {
        for (const diag of transpileResult.diagnostics) {
          const pos =
            diag.file && diag.start !== undefined
              ? diag.file.getLineAndCharacterOfPosition(diag.start)
              : { line: 0, character: 0 };

          const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");

          const exists = diagnostics.some(
            (d) => d.line === pos.line + 1 && d.code === diag.code,
          );
          if (!exists) {
            diagnostics.push({
              line: pos.line + 1,
              character: pos.character + 1,
              message,
              code: diag.code,
              category: this.mapCategory(diag.category),
            });
          }
        }
      }

      const errorDiagnostics = diagnostics.filter((d) => d.category === "error");
      const isValid = errorDiagnostics.length === 0;

      let rawErrorSummary: string | undefined;
      if (!isValid) {
        rawErrorSummary = errorDiagnostics
          .map((d) => `Line ${d.line}:${d.character} [TS${d.code}] ${d.message}`)
          .join("; ");
      }

      return {
        isValid,
        diagnostics,
        rawErrorSummary,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isValid: false,
        diagnostics: [
          {
            line: 1,
            character: 1,
            message: `Diagnostic parser exception: ${msg}`,
            code: 9999,
            category: "error",
          },
        ],
        rawErrorSummary: `Diagnostic parser exception: ${msg}`,
      };
    }
  }

  private mapCategory(
    cat: ts.DiagnosticCategory,
  ): "error" | "warning" | "message" | "suggestion" {
    switch (cat) {
      case ts.DiagnosticCategory.Error:
        return "error";
      case ts.DiagnosticCategory.Warning:
        return "warning";
      case ts.DiagnosticCategory.Suggestion:
        return "suggestion";
      case ts.DiagnosticCategory.Message:
      default:
        return "message";
    }
  }
}
