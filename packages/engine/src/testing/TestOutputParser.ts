export interface ParsedAssertionFailure {
  readonly testName: string;
  readonly file?: string | undefined;
  readonly line?: number | undefined;
  readonly expected?: string | undefined;
  readonly received?: string | undefined;
  readonly rawMessage: string;
}

export interface ParsedTestOutput {
  readonly passed: boolean;
  readonly testsPassed: number;
  readonly testsFailed: number;
  readonly failures: readonly ParsedAssertionFailure[];
  readonly rootCauses: readonly string[];
}

/**
 * TestOutputParser
 *
 * Parses test runner output (Node:test, Jest, Vitest, Mocha, Maven, Go):
 * - Isolates failing test names, files, and line numbers
 * - Extracts expected vs received diffs
 * - Filters out noisy test runner boilerplate and provides clean snippets for LLM remediation
 */
export class TestOutputParser {
  public parse(stdout: string, stderr: string): ParsedTestOutput {
    const combined = `${stdout}\n${stderr}`;
    const failures: ParsedAssertionFailure[] = [];
    const rootCauses: string[] = [];

    const lines = combined.split("\n");

    let currentTestName = "";
    let currentFile = "";
    let currentLine = 0;
    let inFailureBlock = false;
    let failureSnippet: string[] = [];

    // Node:test / Jest / Vitest pattern matching
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || "";

      // Detection of failing test line (e.g. ✖ should do something or FAIL src/foo.test.ts)
      if (line.includes("✖ ") || line.includes("FAIL ") || line.includes("AssertionError") || line.includes("Expected:")) {
        inFailureBlock = true;
      }

      const failMatch = line.match(/(?:✖|FAIL|FAILURE:)\s+(.+)/);
      if (failMatch && failMatch[1]) {
        currentTestName = failMatch[1].trim();
      }

      // Location match: e.g. at ... (/path/to/file.ts:42:15)
      const locMatch = line.match(/(?:\/|[A-Za-z]:\\)[^\s:]+\.(?:ts|js|java|go|rs):(\d+)/);
      if (locMatch && locMatch[0] && locMatch[1]) {
        currentFile = locMatch[0].split(":")[0] || "";
        currentLine = parseInt(locMatch[1], 10);
      }

      if (inFailureBlock) {
        failureSnippet.push(line);
        if (line.includes("AssertionError") || line.includes("Error:") || line.includes("expected") || line.includes("diff:")) {
          rootCauses.push(line.trim());
        }
      }

      // End of failure block
      if (line.trim() === "" && failureSnippet.length > 0 && currentTestName) {
        failures.push({
          testName: currentTestName,
          file: currentFile || undefined,
          line: currentLine || undefined,
          rawMessage: failureSnippet.join("\n").trim()
        });
        failureSnippet = [];
        inFailureBlock = false;
        currentTestName = "";
      }
    }

    // Flush any pending failure
    if (failureSnippet.length > 0 && currentTestName) {
      failures.push({
        testName: currentTestName,
        file: currentFile || undefined,
        line: currentLine || undefined,
        rawMessage: failureSnippet.join("\n").trim()
      });
    }

    const hasFails = failures.length > 0 || combined.includes("FAIL") || combined.includes("✖") || combined.includes("BUILD FAILURE");

    return {
      passed: !hasFails,
      testsPassed: hasFails ? 0 : 1,
      testsFailed: failures.length > 0 ? failures.length : (hasFails ? 1 : 0),
      failures,
      rootCauses: Array.from(new Set(rootCauses)).slice(0, 5)
    };
  }

  /**
   * Formats a clean markdown feedback snippet for LLM self-remediation.
   */
  public formatRemediationSnippet(parsed: ParsedTestOutput): string {
    if (parsed.passed) {
      return "All automated tests passed successfully.";
    }

    const lines: string[] = [];
    lines.push("### Automated Test Execution Failures");
    lines.push(`Found ${parsed.testsFailed} failing test(s). Please review and resolve the failures below:\n`);

    for (const f of parsed.failures) {
      lines.push(`- **Test**: \`${f.testName}\``);
      if (f.file && f.line) {
        lines.push(`  **Location**: \`${f.file}:${f.line}\``);
      }
      lines.push("  **Failure Details**:");
      lines.push("  ```");
      lines.push(`  ${f.rawMessage.split("\n").slice(0, 8).join("\n  ")}`);
      lines.push("  ```");
    }

    if (parsed.rootCauses.length > 0) {
      lines.push("\n**Root Cause Diagnostics**:");
      for (const rc of parsed.rootCauses) {
        lines.push(`- ${rc}`);
      }
    }

    return lines.join("\n");
  }
}
