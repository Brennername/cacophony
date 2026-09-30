import { spawn } from "node:child_process";

export interface SandboxedProcessOptions {
  readonly cwd: string;
  readonly timeoutMs?: number | undefined; 
  readonly maxBufferBytes?: number | undefined; // default 256 * 1024 (256KB)
  readonly env?: NodeJS.ProcessEnv | undefined;
}

export interface SandboxedProcessResult {
  readonly exitCode: number;
  readonly signal: NodeJS.Signals | null;
  readonly durationMs: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly truncated: boolean;
}

/**
 * SandboxedProcessRunner
 *
 * Executes commands in a isolated process group with:
 * - Strict timeout enforcement.
 * - Entire process group termination on timeout or cancellation (preventing zombie processes).
 * - Real-time stream capturing with bounded buffer size to prevent memory bloat.
 */
export class SandboxedProcessRunner {
  private readonly defaultTimeoutMs: number;
  private readonly defaultMaxBufferBytes: number;

  constructor(options?: { defaultTimeoutMs?: number; defaultMaxBufferBytes?: number }) {
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 180000;
    this.defaultMaxBufferBytes = options?.defaultMaxBufferBytes ?? 256 * 1024;
  }

  public async run(
    command: string,
    options: SandboxedProcessOptions
  ): Promise<SandboxedProcessResult> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const maxBuffer = options.maxBufferBytes ?? this.defaultMaxBufferBytes;

    return new Promise<SandboxedProcessResult>((resolve) => {
      let timedOut = false;
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let truncated = false;
      let stdout = "";
      let stderr = "";

      // Spawn using shell with detached: true to allocate a new process group (pid becomes pgid)
      const child = spawn(command, {
        shell: true,
        cwd: options.cwd,
        env: options.env ?? process.env,
        detached: true
      });

      let timeoutTimer: NodeJS.Timeout | null = null;
      if (timeoutMs > 0) {
        timeoutTimer = setTimeout(() => {
          timedOut = true;
          this.killProcessGroup(child.pid);
        }, timeoutMs);
      }

      child.stdout?.on("data", (chunk: Buffer | string) => {
        const str = typeof chunk === "string" ? chunk : chunk.toString("utf-8");
        stdoutBytes += Buffer.byteLength(str, "utf-8");
        if (stdoutBytes <= maxBuffer) {
          stdout += str;
        } else if (!truncated) {
          truncated = true;
          stdout += "\n[OUTPUT TRUNCATED: Exceeded maximum log buffer limit]";
        }
      });

      child.stderr?.on("data", (chunk: Buffer | string) => {
        const str = typeof chunk === "string" ? chunk : chunk.toString("utf-8");
        stderrBytes += Buffer.byteLength(str, "utf-8");
        if (stderrBytes <= maxBuffer) {
          stderr += str;
        } else if (!truncated) {
          truncated = true;
          stderr += "\n[OUTPUT TRUNCATED: Exceeded maximum log buffer limit]";
        }
      });

      child.on("error", (err: Error) => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
        }
        const durationMs = Date.now() - startTime;
        resolve({
          exitCode: 1,
          signal: null,
          durationMs,
          stdout,
          stderr: `${stderr}\n${err.message}`.trim(),
          timedOut,
          truncated
        });
      });

      child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
        }
        const durationMs = Date.now() - startTime;
        const exitCode = timedOut ? 124 : (code ?? (signal ? 1 : 0));

        resolve({
          exitCode,
          signal,
          durationMs,
          stdout,
          stderr: timedOut ? `${stderr}\nExecution timed out after ${timeoutMs}ms`.trim() : stderr,
          timedOut,
          truncated
        });
      });
    });
  }

  /**
   * Safely kills the entire process group rooted at the child PID.
   */
  public killProcessGroup(pid: number | undefined): void {
    if (!pid) {
      return;
    }
    try {
      // Negative PID targets the entire process group in POSIX
      process.kill(-pid, "SIGTERM");

      // Follow up with SIGKILL if still active after 1.5 seconds
      setTimeout(() => {
        try {
          process.kill(-pid, "SIGKILL");
        } catch {
          // Process already terminated
        }
      }, 1500).unref();
    } catch {
      // Process might have already exited
    }
  }
}
