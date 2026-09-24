/**
 * Failure Mode Taxonomy and Classification Engine.
 * Normalizes execution and test errors into structured categories:
 * SYNTAX_ERROR, TYPE_MISMATCH, ASSERTION_FAILURE, TIMEOUT, MISSING_DEPENDENCY,
 * TYPE_CHECK_ERROR, TEST_ASSERTION_FAILURE, BANNED_IMPORT, THERMAL_THROTTLE, CONTEXT_OVERFLOW, UNKNOWN.
 */
export type FailureCategory =
  | "SYNTAX_ERROR"
  | "TYPE_MISMATCH"
  | "ASSERTION_FAILURE"
  | "TIMEOUT"
  | "MISSING_DEPENDENCY"
  | "TYPE_CHECK_ERROR"
  | "TEST_ASSERTION_FAILURE"
  | "BANNED_IMPORT"
  | "THERMAL_THROTTLE"
  | "CONTEXT_OVERFLOW"
  | "UNKNOWN";

export interface StackTraceLocation {
  readonly file: string;
  readonly line: number;
  readonly column?: number | undefined;
  readonly message?: string | undefined;
}

export interface ClassificationResult {
  readonly category: FailureCategory;
  readonly confidence: number;
  readonly matchedPattern?: string | undefined;
  readonly rootCauseSnippet?: string | undefined;
  readonly locations?: readonly StackTraceLocation[] | undefined;
}

export interface ModelFailureDistribution {
  readonly category: FailureCategory;
  readonly count: number;
  readonly percentage: number;
}

export interface ModelRoleFailureStats {
  readonly modelId?: string | undefined;
  readonly role?: string | undefined;
  readonly totalFailures: number;
  readonly distributions: readonly ModelFailureDistribution[];
}

export class FailureClassifier {
  /**
   * Classifies error output, stack traces, compiler outputs or test failures into a normalized category.
   */
  public static classify(errorMessage: string, context?: { exitCode?: number; logOutput?: string }): ClassificationResult {
    const text = `${errorMessage}\n${context?.logOutput ?? ""}`.trim();
    const locations = this.extractStackLocations(text);

    // 1. Thermal throttle
    if (/thermal|throttle|overheat|danger zone|gpu temp exceeded/i.test(text)) {
      return {
        category: "THERMAL_THROTTLE",
        confidence: 0.95,
        matchedPattern: "thermal_governor",
        rootCauseSnippet: "GPU thermal limit exceeded nominal threshold",
        locations
      };
    }

    // 2. Context window overflow / memory
    if (/context.*overflow|token.*limit exceeded|out of memory|oom|vram exhausted/i.test(text)) {
      return {
        category: "CONTEXT_OVERFLOW",
        confidence: 0.95,
        matchedPattern: "context_window",
        rootCauseSnippet: "Context token window limit or VRAM exhaustion",
        locations
      };
    }

    // 3. Command timeout
    if (/timeout|timed out|exceeded maximum command duration/i.test(text) || context?.exitCode === 124) {
      return {
        category: "TIMEOUT",
        confidence: 0.9,
        matchedPattern: "timeout_signal",
        rootCauseSnippet: "Execution exceeded allocated runtime timeout",
        locations
      };
    }

    // 4. Missing dependency (npm/cargo/go/maven module not found)
    if (
      /cannot find module|module not found|no such package|package .* not found|unresolved import|could not find crate|dependency.*not found/i.test(
        text
      )
    ) {
      const match = text.match(/(?:cannot find module|module not found|could not find crate)\s+['"]?([^'"\n]+)['"]?/i);
      return {
        category: "MISSING_DEPENDENCY",
        confidence: 0.95,
        matchedPattern: "missing_dependency",
        rootCauseSnippet: match ? match[0] : "Missing project dependency or module",
        locations
      };
    }

    // 5. Banned imports or deterministic policy rejections
    if (/banned import|disallowed root file|forbidden command|security guardrail/i.test(text)) {
      return {
        category: "BANNED_IMPORT",
        confidence: 0.95,
        matchedPattern: "security_guardrail",
        rootCauseSnippet: "Encountered disallowed dependency or security violation",
        locations
      };
    }

    // 6. Type mismatch / TypeScript / LSP type checking errors
    if (/error TS\d+:|type.*not assignable|property.*does not exist on type|cannot find name|mismatched types|type mismatch/i.test(text)) {
      const match = text.match(/(?:error TS\d+:[^\n]+|mismatched types:[^\n]+|type mismatch:[^\n]+)/i);
      return {
        category: "TYPE_MISMATCH",
        confidence: 0.9,
        matchedPattern: "type_system",
        rootCauseSnippet: match ? match[0] : "Type mismatch or compiler type-check error",
        locations
      };
    }

    // 7. Syntax error (JS/TS, Rust, Go, Java)
    if (/SyntaxError:|unexpected token|parse error|parsing error|syntax error|expected `.*`, found/i.test(text)) {
      const match = text.match(/(?:SyntaxError:[^\n]+|syntax error:[^\n]+|expected `[^`]+`, found[^\n]+)/i);
      return {
        category: "SYNTAX_ERROR",
        confidence: 0.95,
        matchedPattern: "syntax_error",
        rootCauseSnippet: match ? match[0] : "Source code syntax error",
        locations
      };
    }

    // 8. Test assertion failure (Jest, Vitest, cargo test, go test, mvn test)
    if (
      /AssertionError|assert\.|expect\(.*fail|fail\s+\d+|ERR_ASSERTION|assertion `left == right` failed|--- FAIL:|FAILURE!/i.test(
        text
      )
    ) {
      return {
        category: "ASSERTION_FAILURE",
        confidence: 0.9,
        matchedPattern: "test_runner",
        rootCauseSnippet: "Automated test assertion failed",
        locations
      };
    }

    return {
      category: "UNKNOWN",
      confidence: 0.5,
      matchedPattern: "default",
      rootCauseSnippet: text.slice(0, 120),
      locations
    };
  }

  /**
   * Extracts specific failure line numbers and error messages across stack trace formats:
   * Jest/Vitest, cargo test, go test, mvn test.
   */
  public static extractStackLocations(text: string): readonly StackTraceLocation[] {
    const locations: StackTraceLocation[] = [];

    // 1. Jest / Vitest / Node: at file:///path/file.ts:42:15 or at Object.<anonymous> (/path/file.ts:42:15)
    const nodeRegex = /(?:at\s+(?:[^\s()]+\s+)?\(?(?:file:\/\/)?([^\s():]+):(\d+):?(\d+)?\)?)/g;
    let match: RegExpExecArray | null;
    while ((match = nodeRegex.exec(text)) !== null) {
      const file = match[1];
      const line = parseInt(match[2] ?? "0", 10);
      const column = match[3] ? parseInt(match[3], 10) : undefined;
      if (file && line > 0 && !file.includes("node_modules") && !file.includes("node:internal")) {
        locations.push({ file, line, column });
      }
    }

    // 2. Cargo test: --> src/lib.rs:14:5
    const cargoRegex = /-->\s+([^\s:]+\.rs):(\d+):(\d+)/g;
    while ((match = cargoRegex.exec(text)) !== null) {
      const file = match[1];
      const line = parseInt(match[2] ?? "0", 10);
      const column = match[3] ? parseInt(match[3], 10) : undefined;
      if (file && line > 0) {
        locations.push({ file, line, column });
      }
    }

    // 3. Go test: file_test.go:28: assertion failed
    const goRegex = /([a-zA-Z0-9_\-./]+\.go):(\d+)(?::\s*(.+))?/g;
    while ((match = goRegex.exec(text)) !== null) {
      const file = match[1];
      const line = parseInt(match[2] ?? "0", 10);
      const message = match[3]?.trim();
      if (file && line > 0) {
        locations.push({ file, line, message });
      }
    }

    // 4. Maven test: [ERROR] /path/to/File.java:[42,15] error message
    const mvnRegex = /\[ERROR\]\s+([^\s:]+\.java):\[(\d+),(\d+)\](?:\s*(.+))?/g;
    while ((match = mvnRegex.exec(text)) !== null) {
      const file = match[1];
      const line = parseInt(match[2] ?? "0", 10);
      const column = match[3] ? parseInt(match[3], 10) : undefined;
      const message = match[4]?.trim();
      if (file && line > 0) {
        locations.push({ file, line, column, message });
      }
    }

    return locations.slice(0, 10);
  }
}
