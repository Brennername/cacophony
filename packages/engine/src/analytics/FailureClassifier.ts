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

export class ExecutionTimeoutError extends Error {
  public readonly timeoutMs: number;
  public readonly taskId?: string | undefined;
  public readonly model?: string | undefined;

  constructor(message: string, timeoutMs: number, taskId?: string, model?: string) {
    super(message);
    this.name = "ExecutionTimeoutError";
    this.timeoutMs = timeoutMs;
    this.taskId = taskId;
    this.model = model;
    Object.setPrototypeOf(this, ExecutionTimeoutError.prototype);
  }
}

export class FailureClassifier {

  public static classify(errorOrMessage: Error | string, context?: { exitCode?: number; logOutput?: string }): ClassificationResult {
    let text = "";
    if (errorOrMessage instanceof Error) {
      text = `${errorOrMessage.name}: ${errorOrMessage.message}\n${errorOrMessage.stack || ""}\n${context?.logOutput ?? ""}`.trim();
    } else {
      text = `${errorOrMessage}\n${context?.logOutput ?? ""}`.trim();
    }
    const locations = this.extractStackLocations(text);

    if (errorOrMessage instanceof ExecutionTimeoutError) {
      return {
        category: "TIMEOUT",
        confidence: 1.0,
        matchedPattern: "execution_timeout_error",
        rootCauseSnippet: errorOrMessage.message,
        locations
      };
    }

    if (/thermal|throttle|overheat|danger zone|gpu temp exceeded/i.test(text)) {
      return {
        category: "THERMAL_THROTTLE",
        confidence: 0.95,
        matchedPattern: "thermal_governor",
        rootCauseSnippet: "GPU thermal limit exceeded nominal threshold",
        locations
      };
    }

    if (/context.*overflow|token.*limit exceeded|out of memory|oom|vram exhausted/i.test(text)) {
      return {
        category: "CONTEXT_OVERFLOW",
        confidence: 0.95,
        matchedPattern: "context_window",
        rootCauseSnippet: "Context token window limit or VRAM exhaustion",
        locations
      };
    }

    if (
      /timeout|timed out|exceeded maximum command duration|executiontimeouterror|watchdog.*timeout|aborted by watchdog/i.test(
        text
      ) ||
      context?.exitCode === 124
    ) {
      return {
        category: "TIMEOUT",
        confidence: 0.95,
        matchedPattern: "timeout_signal",
        rootCauseSnippet: "Execution exceeded allocated runtime timeout or aborted by watchdog timer",
        locations
      };
    }

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

    if (/banned import|disallowed root file|forbidden command|security guardrail/i.test(text)) {
      return {
        category: "BANNED_IMPORT",
        confidence: 0.95,
        matchedPattern: "security_guardrail",
        rootCauseSnippet: "Encountered disallowed dependency or security violation",
        locations
      };
    }

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

  public static extractStackLocations(text: string): readonly StackTraceLocation[] {
    const locations: StackTraceLocation[] = [];

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

    const cargoRegex = /-->\s+([^\s:]+\.rs):(\d+):(\d+)/g;
    while ((match = cargoRegex.exec(text)) !== null) {
      const file = match[1];
      const line = parseInt(match[2] ?? "0", 10);
      const column = match[3] ? parseInt(match[3], 10) : undefined;
      if (file && line > 0) {
        locations.push({ file, line, column });
      }
    }

    const goRegex = /([a-zA-Z0-9_\-./]+\.go):(\d+)(?::\s*(.+))?/g;
    while ((match = goRegex.exec(text)) !== null) {
      const file = match[1];
      const line = parseInt(match[2] ?? "0", 10);
      const message = match[3]?.trim();
      if (file && line > 0) {
        locations.push({ file, line, message });
      }
    }

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