import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

export interface TestJobRequest {
  readonly taskId: string;
  readonly command: string;
  readonly cwd: string;
  readonly timeoutMs?: number | undefined;
}

export interface TestJobResult {
  readonly taskId: string;
  readonly command: string;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly passed: boolean;
  readonly error?: string | undefined;
}

export interface BackgroundTestWorkerPoolOptions {
  readonly maxConcurrency?: number | undefined;
  readonly defaultTimeoutMs?: number | undefined;
}

/**
 * BackgroundTestWorkerPool
 *
 * Runs test suites (node --test, npm test, vitest) asynchronously in isolated
 * host child processes, freeing the APU/VRAM inference pipeline immediately
 * so subsequent model tasks can begin generation without blocking on test execution.
 */
export class BackgroundTestWorkerPool {
  private readonly maxConcurrency: number;
  private readonly defaultTimeoutMs: number;
  private readonly emitter = new EventEmitter();

  private activeJobs = new Map<string, { process: ChildProcess; startTime: number; command: string }>();
  private queue: TestJobRequest[] = [];
  private isShuttingDown = false;

  constructor(options: BackgroundTestWorkerPoolOptions = {}) {
    this.maxConcurrency = options.maxConcurrency ?? 2;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 180000;
  }

  /**
   * Enqueues a test execution job and returns a Promise that resolves when the job completes.
   */
  public async runTest(job: TestJobRequest): Promise<TestJobResult> {
    if (this.isShuttingDown) {
      throw new Error("BackgroundTestWorkerPool is shutting down");
    }

    return new Promise<TestJobResult>((resolve) => {
      const execute = async () => {
        if (this.activeJobs.size >= this.maxConcurrency) {
          this.queue.push(job);
          return;
        }

        const startTime = Date.now();
        const timeoutMs = job.timeoutMs ?? this.defaultTimeoutMs;

        let stdout = "";
        let stderr = "";

        const child = spawn("sh", ["-c", job.command], {
          cwd: job.cwd,
          env: { ...process.env, NODE_ENV: "test" },
          stdio: ["ignore", "pipe", "pipe"],
        });

        this.activeJobs.set(job.taskId, {
          process: child,
          startTime,
          command: job.command,
        });

        const timer = setTimeout(() => {
          child.kill("SIGKILL");
        }, timeoutMs);

        child.stdout?.on("data", (data: Buffer) => {
          stdout = (stdout + data.toString()).slice(-64000);
        });

        child.stderr?.on("data", (data: Buffer) => {
          stderr = (stderr + data.toString()).slice(-64000);
        });

        child.on("close", (exitCode: number | null) => {
          clearTimeout(timer);
          this.activeJobs.delete(job.taskId);

          const durationMs = Date.now() - startTime;
          const code = exitCode ?? 1;
          const passed = code === 0;

          const result: TestJobResult = {
            taskId: job.taskId,
            command: job.command,
            exitCode: code,
            durationMs,
            stdout,
            stderr,
            passed,
          };

          this.emitter.emit("test_completed", result);
          this.emitter.emit(`test_completed:${job.taskId}`, result);
          resolve(result);

          // Drain next queued job
          this.drainQueue();
        });

        child.on("error", (err: Error) => {
          clearTimeout(timer);
          this.activeJobs.delete(job.taskId);
          const durationMs = Date.now() - startTime;

          const result: TestJobResult = {
            taskId: job.taskId,
            command: job.command,
            exitCode: 1,
            durationMs,
            stdout,
            stderr,
            passed: false,
            error: err.message,
          };

          this.emitter.emit("test_completed", result);
          this.emitter.emit(`test_completed:${job.taskId}`, result);
          resolve(result);

          this.drainQueue();
        });
      };

      void execute();
    });
  }

  /**
   * Registers a listener for asynchronous test completion events.
   */
  public onTestCompleted(listener: (result: TestJobResult) => void, taskId?: string): () => void {
    const eventName = taskId ? `test_completed:${taskId}` : "test_completed";
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  public getActiveCount(): number {
    return this.activeJobs.size;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    for (const [taskId, job] of this.activeJobs.entries()) {
      job.process.kill("SIGKILL");
      this.activeJobs.delete(taskId);
    }
    this.queue = [];
  }

  private drainQueue(): void {
    if (this.queue.length > 0 && this.activeJobs.size < this.maxConcurrency) {
      const next = this.queue.shift();
      if (next) {
        void this.runTest(next);
      }
    }
  }
}
