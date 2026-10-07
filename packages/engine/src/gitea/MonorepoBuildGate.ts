import { SandboxedProcessRunner, type SandboxedProcessResult } from "../testing/SandboxedProcessRunner.js";

export interface CompilerDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly file?: string | undefined;
  readonly line?: number | undefined;
  readonly column?: number | undefined;
}

export interface MonorepoBuildResult {
  readonly passed: boolean;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly stdout: string;
  readonly stderr: string;
  readonly failureSummary?: string | undefined;
}

export interface MonorepoBuildGateOptions {
  readonly sandboxedRunner?: SandboxedProcessRunner | undefined;
  readonly buildCommand?: string | undefined;
  readonly timeoutMs?: number | undefined;
}

/**
 * MonorepoBuildGate
 *
 * Enforces clean monorepo compilation across packages in isolated worktrees
 * before PR creation or staging promotion. Captures diagnostic codes (e.g. TS2304, NG2008)
 * and formats actionable remediation summaries.
 */
export class MonorepoBuildGate {
  private readonly runner: SandboxedProcessRunner;
  private readonly buildCommand: string;
  private readonly timeoutMs: number;

  constructor(options?: MonorepoBuildGateOptions) {
    this.runner = options?.sandboxedRunner ?? new SandboxedProcessRunner();
    this.buildCommand = options?.buildCommand ?? "npm run build";
    this.timeoutMs = options?.timeoutMs ?? 180000;
  }

  /**
   * Extracts compiler diagnostic error codes from standard output and standard error streams.
   */
  public extractDiagnostics(output: string): CompilerDiagnostic[] {
    const diagnostics: CompilerDiagnostic[] = [];
    const seen = new Set<string>();

    // TypeScript diagnostic patterns:
    // e.g. "path/to/file.ts(12,5): error TS2304: Cannot find name 'foo'."
    // e.g. "path/to/file.ts:12:5 - error TS2305: Module 'x' has no exported member 'y'."
    // e.g. "error TS2322: Type 'string' is not assignable to type 'number'."
    const tsRegex = /(?:([a-zA-Z0-9_./\\-]+)[(:]([0-9]+)(?:,([0-9]+)\)?:|\:([0-9]+)\s+-\s+))?\s*(?:error\s+)?(TS[0-9]+):\s*([^\n\r]+)/g;
    let match: RegExpExecArray | null;

    while ((match = tsRegex.exec(output)) !== null) {
      const file = match[1];
      const lineStr = match[2];
      const colStr = match[3] || match[4];
      const code = match[5]!;
      const message = match[6]!.trim();
      const line = lineStr ? parseInt(lineStr, 10) : undefined;
      const column = colStr ? parseInt(colStr, 10) : undefined;

      const key = `${code}:${file || ""}:${line || ""}:${message}`;
      if (!seen.has(key)) {
        seen.add(key);
        diagnostics.push({
          code,
          message,
          ...(file ? { file } : {}),
          ...(line !== undefined ? { line } : {}),
          ...(column !== undefined ? { column } : {})
        });
      }
    }

    // Angular compiler diagnostic patterns:
    // e.g. "Error: NG2008: Component foo is missing templateUrl"
    // e.g. "src/app/foo.component.ts:10:5: error NG8001: 'my-tag' is not a known element"
    const ngRegex = /(?:([a-zA-Z0-9_./\\-]+)[(:]([0-9]+)(?:,([0-9]+)\)?:|\:([0-9]+)\s+-\s+))?\s*(?:[Ee]rror:?\s*)?(NG[0-9]+):\s*([^\n\r]+)/g;
    while ((match = ngRegex.exec(output)) !== null) {
      const file = match[1];
      const lineStr = match[2];
      const colStr = match[3] || match[4];
      const code = match[5]!;
      const message = match[6]!.trim();
      const line = lineStr ? parseInt(lineStr, 10) : undefined;
      const column = colStr ? parseInt(colStr, 10) : undefined;

      const key = `${code}:${file || ""}:${line || ""}:${message}`;
      if (!seen.has(key)) {
        seen.add(key);
        diagnostics.push({
          code,
          message,
          ...(file ? { file } : {}),
          ...(line !== undefined ? { line } : {}),
          ...(column !== undefined ? { column } : {})
        });
      }
    }

    return diagnostics;
  }

  /**
   * Executes the monorepo build command within the target directory,
   * evaluating exit codes and extracting compiler diagnostics.
   */
  public async verifyBuild(cwd: string): Promise<MonorepoBuildResult> {
    const runResult: SandboxedProcessResult = await this.runner.run(this.buildCommand, {
      cwd,
      timeoutMs: this.timeoutMs,
      maxBufferBytes: 512 * 1024
    });

    const passed = runResult.exitCode === 0;
    const combinedOutput = `${runResult.stdout}\n${runResult.stderr}`;
    const diagnostics = this.extractDiagnostics(combinedOutput);

    let failureSummary: string | undefined;
    if (!passed) {
      if (diagnostics.length > 0) {
        failureSummary = `Build failed with ${diagnostics.length} diagnostic error(s): ` +
          diagnostics
            .slice(0, 10)
            .map((diag) => `${diag.code}${diag.file ? ` in ${diag.file}` : ""}: ${diag.message}`)
            .join("; ");
      } else {
        const rawErr = (runResult.stderr.trim() || runResult.stdout.trim() || `Exit code ${runResult.exitCode}`);
        failureSummary = rawErr.slice(-500);
      }
    }

    return {
      passed,
      exitCode: runResult.exitCode,
      durationMs: runResult.durationMs,
      diagnostics,
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      ...(failureSummary ? { failureSummary } : {})
    };
  }
}
