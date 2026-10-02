import { Diagnostic, DiagnosticSeverity } from '@cacophony/shared-types';

/**
 * Parses raw compiler output into typed diagnostics.
 */
export class CompilerDiagnosticParser {
  /**
   * Parses a line of raw compiler output and returns a typed diagnostic if applicable.
   * @param line - The line of raw compiler output to parse.
   * @returns A typed diagnostic if the line contains diagnostic information, otherwise undefined.
   */
  public static parseLine(line: string): Diagnostic | undefined {
    // Example pattern for a typical TypeScript compiler error:
    // src/index.ts:10:5 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
    const diagnosticPattern = /^(.*?):(\d+):(\d+) - (error|warning) (.*)$/;
    const match = line.match(diagnosticPattern);

    if (!match) {
      return undefined;
    }

    const [_, filePath, lineNumberStr, columnNumberStr, severityStr, message] = match;

    const lineNumber = parseInt(lineNumberStr, 10);
    const columnNumber = parseInt(columnNumberStr, 10);
    const severity: DiagnosticSeverity = severityStr === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning;

    return {
      filePath,
      lineNumber,
      columnNumber,
      severity,
      message,
    };
  }

  /**
   * Parses an array of raw compiler output lines and returns an array of typed diagnostics.
   * @param lines - The array of raw compiler output lines to parse.
   * @returns An array of typed diagnostics.
   */
  public static parseLines(lines: string[]): Diagnostic[] {
    return lines.map(line => this.parseLine(line)).filter((diagnostic): diagnostic is Diagnostic => diagnostic !== undefined);
  }
}