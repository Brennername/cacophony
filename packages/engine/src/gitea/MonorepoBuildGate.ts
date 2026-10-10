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
   * Pre-commit monorepo clean build verification gate (Phase 84 T84.2).
   */
  public async verifyCleanBuild(worktreePath: string): Promise<MonorepoBuildResult> {
    return this.verifyBuild(worktreePath);
  }

  /**
   * Extracts compiler diagnostic error codes from standard output and standard error streams.
   */
  public extractDiagnostics(output: string): CompilerDiagnostic[] {
    const diagnostics: CompilerDiagnostic[] = [];
    const seen = new Set<string>();

    const lines = output.split(/\r?\n/);
    for (const rawLine of lines) {
      const lineStr = rawLine.trim();
      if (!lineStr) continue;

      // TypeScript diagnostic patterns: TS[0-9]+:
      const tsCodeMatch = lineStr.match(/\b(TS[0-9]+):\s*([^\r\n]+)/);
      if (tsCodeMatch) {
        const code = tsCodeMatch[1]!;
        const message = tsCodeMatch[2]!.trim();
        let file: string | undefined;
        let line: number | undefined;
        let column: number | undefined;

        const locMatch = lineStr.match(/^([a-zA-Z0-9_./\\-]+)(?:(?:\(([0-9]+),([0-9]+)\))|(?::([0-9]+):([0-9]+)))/);
        if (locMatch) {
          file = locMatch[1];
          const l = locMatch[2] || locMatch[4];
          const c = locMatch[3] || locMatch[5];
          if (l) line = parseInt(l, 10);
          if (c) column = parseInt(c, 10);
        }

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
        continue;
      }

      // Angular compiler diagnostic patterns: NG[0-9]+:
      const ngCodeMatch = lineStr.match(/\b(NG[0-9]+):\s*([^\r\n]+)/);
      if (ngCodeMatch) {
        const code = ngCodeMatch[1]!;
        const message = ngCodeMatch[2]!.trim();
        let file: string | undefined;
        let line: number | undefined;
        let column: number | undefined;

        const locMatch = lineStr.match(/^([a-zA-Z0-9_./\\-]+)(?:(?:\(([0-9]+),([0-9]+)\))|(?::([0-9]+):([0-9]+)))/);
        if (locMatch) {
          file = locMatch[1];
          const l = locMatch[2] || locMatch[4];
          const c = locMatch[3] || locMatch[5];
          if (l) line = parseInt(l, 10);
          if (c) column = parseInt(c, 10);
        }

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
