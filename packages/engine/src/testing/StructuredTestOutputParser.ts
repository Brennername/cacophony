import { TestOutputParser, type ParsedTestOutput } from "./TestOutputParser.js";

export interface FailingTestExtraction {
  readonly filePaths: string[];
  readonly assertions: string[];
  readonly lineNumbers: number[];
}

export interface TestCounterSummary {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
}

export interface StructuredTestReport extends ParsedTestOutput {
  readonly counters: TestCounterSummary;
  readonly durationMs: number;
  readonly failingDetails: FailingTestExtraction;
}

/**
 * StructuredTestOutputParser
 *
 * Extracts structured pass/fail counters, execution durations, failure reasons,
 * and location-precise stack trace mappings from raw test runner output.
 */
export class StructuredTestOutputParser extends TestOutputParser {
  /**
   * Extracts failing test file paths, failing assertion descriptions, and line numbers from stderr stack traces.
   * Handles edge cases gracefully where file paths or line numbers are omitted, or input is malformed.
   */
  public extractFailingTests(stderr?: string): FailingTestExtraction {
    const filePaths: string[] = [];
    const assertions: string[] = [];
    const lineNumbers: number[] = [];

    if (!stderr || typeof stderr !== "string" || stderr.trim().length === 0) {
      return { filePaths, assertions, lineNumbers };
    }

    // Clean ANSI color codes from stderr before parsing
    const cleanStderr = stderr.replace(/\u001b\[\d+m/g, "");

    // Regex 1: Matches "at functionName (filePath:line:col)"
    // Regex 2: Matches "at filePath:line:col"
    const parensRegex = /at\s+(.*?)\s*\((.*?):(\d+)(?::\d+)?\)/g;
    const directRegex = /at\s+((?:\/|[A-Za-z]:\\|[.]{1,2}\/)[^\s:()]+\.[a-zA-Z0-9]+):(\d+)(?::\d+)?/g;

    let match: RegExpExecArray | null;

    while ((match = parensRegex.exec(cleanStderr)) !== null) {
      const assertionRaw = match[1] ?? "";
      const filePath = match[2] ?? "";
      const rawLine = match[3] ?? "0";
      const assertion = assertionRaw.includes("at ")
        ? (assertionRaw.split("at ")[1] ?? assertionRaw)
        : assertionRaw;
      const lineNumber = parseInt(rawLine, 10);

      filePaths.push(filePath.trim());
      assertions.push(assertion.trim());
      lineNumbers.push(isNaN(lineNumber) ? 0 : lineNumber);
    }

    // If parensRegex did not match any lines, try directRegex
    if (filePaths.length === 0) {
      while ((match = directRegex.exec(cleanStderr)) !== null) {
        const filePath = match[1] ?? "";
        const rawLine = match[2] ?? "0";
        const lineNumber = parseInt(rawLine, 10);

        filePaths.push(filePath.trim());
        assertions.push("anonymous assertion");
        lineNumbers.push(isNaN(lineNumber) ? 0 : lineNumber);
      }
    }

    return { filePaths, assertions, lineNumbers };
  }

  /**
   * Extracts pass, fail, skipped, and total counters from runner output.
   * Supports Node.js test runner, Vitest, Jest, and Mocha output styles.
   */
  public extractCounters(output: string): TestCounterSummary {
    if (!output || typeof output !== "string") {
      return { total: 0, passed: 0, failed: 0, skipped: 0 };
    }

    const clean = output.replace(/\u001b\[\d+m/g, "");

    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // Node.js test runner format:
    // ℹ tests 16
    // ℹ pass 16
    // ℹ fail 0
    // ℹ skipped 0
    const nodeTestsMatch = clean.match(/ℹ\s+tests\s+(\d+)/i);
    const nodePassMatch = clean.match(/ℹ\s+pass\s+(\d+)/i);
    const nodeFailMatch = clean.match(/ℹ\s+fail\s+(\d+)/i);
    const nodeSkipMatch = clean.match(/ℹ\s+skipped\s+(\d+)/i);

    if (nodeTestsMatch?.[1]) {
      total = parseInt(nodeTestsMatch[1], 10) || 0;
      passed = parseInt(nodePassMatch?.[1] || "0", 10) || 0;
      failed = parseInt(nodeFailMatch?.[1] || "0", 10) || 0;
      skipped = parseInt(nodeSkipMatch?.[1] || "0", 10) || 0;
      return { total, passed, failed, skipped };
    }

    // Jest / Vitest format:
    // Tests: 2 failed, 10 passed, 12 total
    const jestPass = clean.match(/(\d+)\s+passed/i);
    const jestFail = clean.match(/(\d+)\s+failed/i);
    const jestSkip = clean.match(/(\d+)\s+skipped/i);
    const jestTotal = clean.match(/(\d+)\s+total/i);

    if (jestPass || jestFail || jestTotal) {
      passed = parseInt(jestPass?.[1] || "0", 10) || 0;
      failed = parseInt(jestFail?.[1] || "0", 10) || 0;
      skipped = parseInt(jestSkip?.[1] || "0", 10) || 0;
      total = jestTotal ? parseInt(jestTotal[1] || "0", 10) : passed + failed + skipped;
      return { total, passed, failed, skipped };
    }

    return { total: 0, passed: 0, failed: 0, skipped: 0 };
  }

  /**
   * Extracts test duration in milliseconds from stdout / stderr.
   */
  public extractDuration(output: string): number {
    if (!output || typeof output !== "string") {
      return 0;
    }

    const clean = output.replace(/\u001b\[\d+m/g, "");

    // Node.js test runner: ℹ duration_ms 104.06101
    const nodeMsMatch = clean.match(/ℹ\s+duration_ms\s+([\d.]+)/i);
    if (nodeMsMatch?.[1]) {
      return parseFloat(nodeMsMatch[1]) || 0;
    }

    // Vitest / Jest: Duration 10.05s or Time: 3.456 s
    const secMatch = clean.match(/(?:duration|time):\s*([\d.]+)\s*s/i) || clean.match(/duration\s+([\d.]+)\s*s/i);
    if (secMatch?.[1]) {
      return Math.round(parseFloat(secMatch[1]) * 1000) || 0;
    }

    // Millisecond match: (12.34ms)
    const msMatch = clean.match(/\(([\d.]+)\s*ms\)/i);
    if (msMatch?.[1]) {
      return parseFloat(msMatch[1]) || 0;
    }

    return 0;
  }

  /**
   * Isolates concise root cause failure messages, discarding runner noise.
   */
  public isolateFailureReasons(output: string): string[] {
    if (!output || typeof output !== "string") {
      return [];
    }

    const clean = output.replace(/\u001b\[\d+m/g, "");
    const reasons: string[] = [];

    const lines = clean.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("AssertionError") ||
        trimmed.startsWith("Error:") ||
        trimmed.startsWith("TypeError:") ||
        (trimmed.includes("expected") && trimmed.includes("to")) ||
        trimmed.includes("Expected:")
      ) {
        if (!reasons.includes(trimmed)) {
          reasons.push(trimmed);
        }
      }
    }

    return reasons;
  }
}
