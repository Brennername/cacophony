/**
 * Failure Mode Taxonomy and Classification Engine.
 * Normalizes execution and test errors into structured categories:
 * SYNTAX_ERROR, TEST_ASSERTION_FAILURE, TYPE_CHECK_ERROR, BANNED_IMPORT,
 * THERMAL_THROTTLE, CONTEXT_OVERFLOW, TIMEOUT, UNKNOWN.
 */
export type FailureCategory =
  | "SYNTAX_ERROR"
  | "TEST_ASSERTION_FAILURE"
  | "TYPE_CHECK_ERROR"
  | "BANNED_IMPORT"
  | "THERMAL_THROTTLE"
  | "CONTEXT_OVERFLOW"
  | "TIMEOUT"
  | "UNKNOWN";

export interface ClassificationResult {
  readonly category: FailureCategory;
  readonly confidence: number;
  readonly matchedPattern?: string;
  readonly rootCauseSnippet?: string;
}

export class FailureClassifier {
  /**
   * Classifies error output, stack traces, compiler outputs or test failures into a normalized category.
   */
  public static classify(errorMessage: string, context?: { exitCode?: number; logOutput?: string }): ClassificationResult {
    const text = `${errorMessage}\n${context?.logOutput ?? ""}`.trim();

    // 1. Thermal throttle
    if (/thermal|throttle|overheat|danger zone|gpu temp exceeded/i.test(text)) {
      return {
        category: "THERMAL_THROTTLE",
        confidence: 0.95,
        matchedPattern: "thermal_governor",
        rootCauseSnippet: "GPU thermal limit exceeded nominal threshold"
      };
    }

    // 2. Context window overflow / memory
    if (/context.*overflow|token.*limit exceeded|out of memory|oom|vram exhausted/i.test(text)) {
      return {
        category: "CONTEXT_OVERFLOW",
        confidence: 0.95,
        matchedPattern: "context_window",
        rootCauseSnippet: "Context token window limit or VRAM exhaustion"
      };
    }

    // 3. Command timeout
    if (/timeout|timed out|exceeded maximum command duration/i.test(text) || context?.exitCode === 124) {
      return {
        category: "TIMEOUT",
        confidence: 0.9,
        matchedPattern: "timeout_signal",
        rootCauseSnippet: "Execution exceeded allocated runtime timeout"
      };
    }

    // 4. Banned imports or deterministic policy rejections
    if (/banned import|disallowed root file|forbidden command|security guardrail/i.test(text)) {
      return {
        category: "BANNED_IMPORT",
        confidence: 0.95,
        matchedPattern: "security_guardrail",
        rootCauseSnippet: "Encountered disallowed dependency or security violation"
      };
    }

    // 5. TypeScript / LSP compile type checking errors
    if (/error TS\d+:|type.*not assignable|property.*does not exist on type|cannot find name/i.test(text)) {
      const match = text.match(/error TS\d+:[^\n]+/i);
      return {
        category: "TYPE_CHECK_ERROR",
        confidence: 0.9,
        matchedPattern: "ts_compiler",
        rootCauseSnippet: match ? match[0] : "TypeScript compiler error"
      };
    }

    // 6. Syntax error
    if (/SyntaxError:|unexpected token|parse error|parsing error/i.test(text)) {
      const match = text.match(/SyntaxError:[^\n]+/i);
      return {
        category: "SYNTAX_ERROR",
        confidence: 0.95,
        matchedPattern: "syntax_error",
        rootCauseSnippet: match ? match[0] : "Source code syntax error"
      };
    }

    // 7. Test assertion failure
    if (/AssertionError|assert\.|expect\(.*fail|fail\s+\d+|ERR_ASSERTION/i.test(text)) {
      return {
        category: "TEST_ASSERTION_FAILURE",
        confidence: 0.9,
        matchedPattern: "test_runner",
        rootCauseSnippet: "Automated test assertion failed"
      };
    }

    return {
      category: "UNKNOWN",
      confidence: 0.5,
      matchedPattern: "default",
      rootCauseSnippet: text.slice(0, 120)
    };
  }
}
