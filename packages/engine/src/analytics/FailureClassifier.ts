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

    if (
      /\bcontext\s+(?:window\s+|length\s+|size\s+)?overflow\b|\btoken\s+(?:count\s+|window\s+|size\s+)?limit\s+exceeded\b|\bout of memory\b|\boom\b|\bvram exhausted\b/i.test(
        text
      ) ||
      (text.toLowerCase().includes("context") && text.toLowerCase().includes("overflow")) ||
      (text.toLowerCase().includes("token") && text.toLowerCase().includes("limit exceeded"))
    ) {
      return {
        category: "CONTEXT_OVERFLOW",
        confidence: 0.95,
        matchedPattern: "context_window",
        rootCauseSnippet: "Context token window limit or VRAM exhaustion",
        locations
      };
    }

    if (
      /timeout|timed out|exceeded maximum command duration|executiontimeouterror|watchdog(?:\s+\w+)?\s+timeout|aborted by watchdog/i.test(
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
      /cannot find module|module not found|no such package|package\s+\S+(?:\s+\S+){0,3}\s+not found|unresolved import|could not find crate|dependency\s+\S+(?:\s+\S+){0,3}\s+not found|has no exported member|could not find\s+['"]?[^\s'"]+dist\//i.test(
        text
      )
    ) {
      const match = text.match(/(?:cannot find module|module not found|could not find crate|has no exported member)\s+['"]?([^'"\n]+)['"]?/i);
      return {
        category: "MISSING_DEPENDENCY",
        confidence: 0.95,
        matchedPattern: "missing_dependency",
        rootCauseSnippet: match ? match[0] : "Missing project dependency or module",
        locations
      };
    }

    if (/banned import|disallowed root file|forbidden command|security guardrail|rejected unsafe|generated replacement shrinks|left a stub|stripped\s+[^\r\n]{0,60}\s+comment block/i.test(text)) {
      return {
        category: "BANNED_IMPORT",
        confidence: 0.95,
        matchedPattern: "security_guardrail",
        rootCauseSnippet: "Encountered disallowed dependency or security/integrity violation",
        locations
      };
    }

    if (
      /error TS\d+:|cannot find namespace|cannot find name|implicitly has an 'any' type|type\s+[^\r\n]{0,80}\s+not assignable|property\s+[^\r\n]{0,80}\s+does not exist on type|is declared but its value is never read|mismatched types|type mismatch|compilation check failed|package build check failed|tsc -b/i.test(
        text
      )
    ) {
      const match = text.match(/(?:error TS\d+:[^\n]+|cannot find namespace[^\n]+|cannot find name[^\n]+|mismatched types:[^\n]+|type mismatch:[^\n]+|compilation check failed[^\n]*)/i);
      return {
        category: "TYPE_MISMATCH",
        confidence: 0.9,
        matchedPattern: "type_system",
        rootCauseSnippet: match ? match[0] : "Type mismatch or compiler type-check error",
        locations
      };
    }

    if (
      /SyntaxError:|unexpected token|parse error|parsing error|syntax error|not parseable|unterminated string literal|expression expected|self-healing parser failed|no code block extracted|expected `[^`\r\n]+`, found/i.test(
        text
      )
    ) {
      const match = text.match(/(?:SyntaxError:[^\n]+|syntax error:[^\n]+|not parseable[^\n]*|unterminated string literal[^\n]*|expected `[^`\r\n]+`, found[^\n]+)/i);
      return {
        category: "SYNTAX_ERROR",
        confidence: 0.95,
        matchedPattern: "syntax_error",
        rootCauseSnippet: match ? match[0] : "Source code syntax error",
        locations
      };
    }

    if (
      /AssertionError|assert\.|expect\([^\r\n]{0,50}?fail|fail\s+\d+|ERR_ASSERTION|assertion `left == right` failed|--- FAIL:|FAILURE!|test command failed|stage failed verification|failed verification/i.test(
        text
      )
    ) {
      return {
        category: "ASSERTION_FAILURE",
        confidence: 0.9,
        matchedPattern: "test_runner",
        rootCauseSnippet: "Automated test or verification assertion failed",
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

    // Extract Go test/trace failure locations linearly to prevent polynomial backtracking on arbitrary inputs.
    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      let searchStart = 0;
      while (searchStart < trimmed.length) {
        const dotGoIdx = trimmed.indexOf(".go:", searchStart);
        if (dotGoIdx === -1) {
          break;
        }
        const prefix = trimmed.slice(0, dotGoIdx + 3);
        const lastSpace = prefix.lastIndexOf(" ");
        const lastTab = prefix.lastIndexOf("\t");
        const startIdx = Math.max(lastSpace, lastTab) + 1;
        const file = prefix.slice(startIdx);
        const rest = trimmed.slice(dotGoIdx + 4);
        const lineMatch = /^(\d+)(?::\s*([^\r\n]+))?/.exec(rest);
        if (lineMatch && file) {
          const line = parseInt(lineMatch[1] ?? "0", 10);
          const message = lineMatch[2]?.trim();
          if (line > 0) {
            locations.push({ file, line, message });
          }
        }
        searchStart = dotGoIdx + 4;
      }
    }

    const mvnRegex = /\[ERROR\]\s+([^\s:]+\.java):\[(\d+),(\d+)\](?:\s*([^\r\n]+))?/g;
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