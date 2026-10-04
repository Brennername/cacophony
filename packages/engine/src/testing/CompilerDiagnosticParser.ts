export type CompilerDiagnosticSeverity = "error" | "warning";

export interface CompilerDiagnostic {
  readonly filePath: string;
  readonly lineNumber: number;
  readonly columnNumber: number;
  readonly severity: CompilerDiagnosticSeverity;
  readonly message: string;
  readonly errorCode?: string | undefined;
}

export class CompilerDiagnosticParser {

  public static parseLine(line: string): CompilerDiagnostic | undefined {
    const trimmed = line.trim();
    if (!trimmed) {
      return undefined;
    }

    const patternColon = /^(.*?):(\d+):(\d+)\s*-\s*(error|warning)\s*(?:(TS\d+):\s*)?(.*)$/i;
    const matchColon = trimmed.match(patternColon);
    if (matchColon) {
      const filePath = matchColon[1] ?? "";
      const lineNumber = parseInt(matchColon[2] ?? "0", 10);
      const columnNumber = parseInt(matchColon[3] ?? "0", 10);
      const severity: CompilerDiagnosticSeverity =
        matchColon[4]?.toLowerCase() === "warning" ? "warning" : "error";
      const errorCode = matchColon[5] ?? undefined;
      const message = matchColon[6]?.trim() ?? "";

      return {
        filePath,
        lineNumber: isNaN(lineNumber) ? 0 : lineNumber,
        columnNumber: isNaN(columnNumber) ? 0 : columnNumber,
        severity,
        message,
        errorCode
      };
    }

    const patternParen = /^(.*?)\((\d+),(\d+)\):\s*(error|warning)\s*(?:(TS\d+):\s*)?(.*)$/i;
    const matchParen = trimmed.match(patternParen);
    if (matchParen) {
      const filePath = matchParen[1] ?? "";
      const lineNumber = parseInt(matchParen[2] ?? "0", 10);
      const columnNumber = parseInt(matchParen[3] ?? "0", 10);
      const severity: CompilerDiagnosticSeverity =
        matchParen[4]?.toLowerCase() === "warning" ? "warning" : "error";
      const errorCode = matchParen[5] ?? undefined;
      const message = matchParen[6]?.trim() ?? "";

      return {
        filePath,
        lineNumber: isNaN(lineNumber) ? 0 : lineNumber,
        columnNumber: isNaN(columnNumber) ? 0 : columnNumber,
        severity,
        message,
        errorCode
      };
    }

    return undefined;
  }

  public static parseLines(lines: string[]): CompilerDiagnostic[] {
    const diagnostics: CompilerDiagnostic[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";

      const single = this.parseLine(line);
      if (single) {
        diagnostics.push(single);
        continue;
      }

      const angularHeader = line.match(/(?:[^\\[]*\s*)?\[(ERROR|WARNING)\]\s*(?:(TS\d+|NG\d+):\s*)?(.*)/i);
      if (angularHeader) {
        const severity: CompilerDiagnosticSeverity =
          angularHeader[1]?.toUpperCase() === "WARNING" ? "warning" : "error";
        const errorCode = angularHeader[2] ?? undefined;
        const message = angularHeader[3]?.trim() ?? "";

        let resolvedLocation: { filePath: string; lineNumber: number; columnNumber: number } | undefined;
        for (let j = i + 1; j <= Math.min(i + 4, lines.length - 1); j++) {
          const locMatch = lines[j]?.match(/^\s*(.*?):(\d+):(\d+):?\s*$/);
          if (locMatch) {
            resolvedLocation = {
              filePath: locMatch[1]?.trim() ?? "",
              lineNumber: parseInt(locMatch[2] ?? "0", 10),
              columnNumber: parseInt(locMatch[3] ?? "0", 10)
            };
            break;
          }
        }

        if (resolvedLocation) {
          diagnostics.push({
            filePath: resolvedLocation.filePath,
            lineNumber: isNaN(resolvedLocation.lineNumber) ? 0 : resolvedLocation.lineNumber,
            columnNumber: isNaN(resolvedLocation.columnNumber) ? 0 : resolvedLocation.columnNumber,
            severity,
            message,
            errorCode
          });
        } else if (message) {

          diagnostics.push({
            filePath: "",
            lineNumber: 0,
            columnNumber: 0,
            severity,
            message,
            errorCode
          });
        }
      }
    }

    return diagnostics;
  }

  public static prioritizeDiagnostics(
    diagnostics: readonly CompilerDiagnostic[],
    limit = 3
  ): CompilerDiagnostic[] {
    if (diagnostics.length <= limit) {
      return [...diagnostics];
    }

    const score = (d: CompilerDiagnostic): number => {
      let points = d.severity === "error" ? 100 : 10;
      if (d.errorCode) {

        if (d.errorCode === "TS2307" || d.errorCode === "TS2304") points += 50; // Cannot find module / name
        if (d.errorCode.startsWith("TS1")) points += 40; // Syntax errors
        if (d.errorCode === "TS2345" || d.errorCode === "TS2322") points += 30; // Type mismatch
      }
      return points;
    };

    return [...diagnostics]
      .sort((a, b) => score(b) - score(a))
      .slice(0, limit);
  }
}
