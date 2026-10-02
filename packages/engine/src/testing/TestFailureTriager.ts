export type FailureClassification =
  | "AssertionFailure"
  | "CompilationError"
  | "RuntimeCrash"
  | "Timeout";

export interface TriagedFailure {
  readonly classification: FailureClassification;
  readonly details: string;
  readonly failingFile?: string;
  readonly failingLine?: number;
  readonly expected?: string;
  readonly actual?: string;
  readonly minimalSnippet?: string;
}

export interface TestExecutionOutput {
  readonly exitCode?: number;
  readonly durationMs?: number;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly timedOut?: boolean;
}

/**
 * TestFailureTriager
 *
 * Analyzes automated test runner stderr and stdout to classify failure causes
 * into AssertionFailure, CompilationError, RuntimeCrash, or Timeout, and extracts
 * focused remediation context for subsequent model repair cycles.
 */
export class TestFailureTriager {
  /**
   * Classifies test execution output into one of the canonical failure categories.
   */
  public classifyFailure(output: TestExecutionOutput): FailureClassification {
    if (output.timedOut) {
      return "Timeout";
    }

    const combined = `${output.stderr ?? ""} ${output.stdout ?? ""}`;

    if (
      combined.includes("AssertionError") ||
      combined.includes("Expected:") ||
      combined.includes("assert.strictEqual") ||
      combined.includes("ERR_ASSERTION")
    ) {
      return "AssertionFailure";
    }

    if (
      combined.includes("error TS") ||
      combined.includes("SyntaxError") ||
      combined.includes("Cannot find module") ||
      combined.includes("Type '") ||
      combined.includes("is not assignable")
    ) {
      return "CompilationError";
    }

    if (
      combined.includes("Timeout") ||
      combined.includes("timed out") ||
      combined.includes("ETIMEDOUT")
    ) {
      return "Timeout";
    }

    return "RuntimeCrash";
  }

  /**
   * Extracts clean, structured failure context for inclusion in the remediation prompt.
   */
  public buildRemediationContext(output: TestExecutionOutput): string {
    const classification = this.classifyFailure(output);
    const raw = (output.stderr || output.stdout || "").trim();
    const snippet = raw.split("\n").slice(0, 30).join("\n");
    return `Failure Category: ${classification}\n\nDiagnostic Output:\n${snippet}`;
  }
}