import { TestOutputParser } from "./TestOutputParser.js";

export interface FailingTestExtraction {
  readonly filePaths: string[];
  readonly assertions: string[];
  readonly lineNumbers: number[];
}

/**
 * StructuredTestOutputParser extracts structured failure details from stack traces.
 */
export class StructuredTestOutputParser extends TestOutputParser {
  /**
   * Extracts failing test file paths, failing assertion descriptions, and line numbers from stderr stack traces.
   */
  public extractFailingTests(stderr: string): FailingTestExtraction {
    const regex = /at\s+(.*?)\s*\((.*?):(\d+):\d+\)/g;
    let match: RegExpExecArray | null;
    const filePaths: string[] = [];
    const assertions: string[] = [];
    const lineNumbers: number[] = [];

    while ((match = regex.exec(stderr)) !== null) {
      const assertionRaw = match[1] ?? "";
      const filePath = match[2] ?? "";
      const rawLine = match[3] ?? "0";
      const assertion = assertionRaw.includes("at ") ? (assertionRaw.split("at ")[1] ?? assertionRaw) : assertionRaw;
      const lineNumber = parseInt(rawLine, 10);

      filePaths.push(filePath);
      assertions.push(assertion);
      lineNumbers.push(isNaN(lineNumber) ? 0 : lineNumber);
    }

    return { filePaths, assertions, lineNumbers };
  }
}