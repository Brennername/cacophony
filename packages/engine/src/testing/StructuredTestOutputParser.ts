import { TestOutputParser } from '../testing/TestOutputParser';

/**
 * StructuredTestOutputParser class to parse structured test output.
 */
export class StructuredTestOutputParser extends TestOutputParser {
  /**
   * Extracts failing test file paths, failing assertion descriptions, and line numbers from stderr stack traces.
   * @param {string} stderr - The stderr output containing the stack traces.
   * @returns {{filePaths: string[], assertions: string[], lineNumbers: number[]}} An object containing arrays of failing test file paths, failing assertion descriptions, and line numbers.
   */
  public extractFailingTests(stderr: string): { filePaths: string[]; assertions: string[]; lineNumbers: number[] } {
    const regex = /at\s+(.*?)\s*\((.*?):(\d+):\d+\)/g;
    let match;
    const failingTests = { filePaths: [], assertions: [], lineNumbers: [] };

    while ((match = regex.exec(stderr)) !== null) {
      const filePath = match[2];
      const assertion = match[1].split('at ')[1];
      const lineNumber = parseInt(match[3], 10);

      failingTests.filePaths.push(filePath);
      failingTests.assertions.push(assertion);
      failingTests.lineNumbers.push(lineNumber);
    }

    return failingTests;
  }
}