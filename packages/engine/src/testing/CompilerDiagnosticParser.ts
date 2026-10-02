export type CompilerDiagnosticSeverity = "error" | "warning";

export interface CompilerDiagnostic {
  readonly filePath: string;
  readonly lineNumber: number;
  readonly columnNumber: number;
  readonly severity: CompilerDiagnosticSeverity;
  readonly message: string;
}

/**
 * Parses raw compiler output into typed diagnostics.
 */
export class CompilerDiagnosticParser {
  /**
   * Parses a line of raw compiler output and returns a typed diagnostic if applicable.
   * @param line - The line of raw compiler output to parse.
   * @returns A typed diagnostic if the line contains diagnostic information, otherwise undefined.
   */
  public static parseLine(line: string): CompilerDiagnostic | undefined {
    // Example pattern for TypeScript compiler error:
    // src/index.ts:10:5 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
    const diagnosticPattern = /^(.*?):(\d+):(\d+) - (error|warning) (.*)$/;
    const match = line.match(diagnosticPattern);

    if (!match) {
      return undefined;
    }

    const filePath = match[1] ?? "";
    const lineNumberStr = match[2] ?? "0";
    const columnNumberStr = match[3] ?? "0";
    const severityStr = match[4] ?? "error";
    const message = match[5] ?? "";

    const lineNumber = parseInt(lineNumberStr, 10);
    const columnNumber = parseInt(columnNumberStr, 10);
    const severity: CompilerDiagnosticSeverity = severityStr === "warning" ? "warning" : "error";

    return {
      filePath,
      lineNumber: isNaN(lineNumber) ? 0 : lineNumber,
      columnNumber: isNaN(columnNumber) ? 0 : columnNumber,
      severity,
      message,
    };
  }

  /**
   * Parses an array of raw compiler output lines and returns an array of typed diagnostics.
   * @param lines - The array of raw compiler output lines to parse.
   * @returns An array of typed diagnostics.
   */
  public static parseLines(lines: string[]): CompilerDiagnostic[] {
    return lines
      .map((line) => this.parseLine(line))
      .filter((diagnostic): diagnostic is CompilerDiagnostic => diagnostic !== undefined);
  }
}