import type { TaskRepository, StageRepository } from "@cacophony/db";
import type { TaskRecord, AgentRole } from "@cacophony/shared-types";
import { ExecutionMutex } from "./ExecutionMutex.js";
import { OllamaStateProbe } from "./OllamaStateProbe.js";
import { ModelEvictionManager } from "./ModelEvictionManager.js";
import { ModelAffinityTaskSorter } from "./ModelAffinityTaskSorter.js";
import { QueueGroomer, type GroomedTask } from "./QueueGroomer.js";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";
import type { IHardwareTelemetryProvider } from "../telemetry/IHardwareTelemetryProvider.js";
import { FailureClassifier, ExecutionTimeoutError } from "../analytics/FailureClassifier.js";

export type TaskExecutionResult = { success: boolean; tokensPerSec: number };
export type TaskExecutionHandler = (groomed: GroomedTask, selectedModel: string) => Promise<TaskExecutionResult>;

/**
 * TaskScheduler
 *
 * Master autonomous scheduling daemon managing the single-concurrency queue.
 * Coordinates task prioritization, model affinity sorting, consecutive-failure eviction,
 * thermal pacing, and execution lifecycle state transitions.
 */
export class TaskScheduler {
  private readonly taskRepo: TaskRepository;
  private readonly stageRepo: StageRepository;
  private readonly mutex: ExecutionMutex;
  private readonly probe: OllamaStateProbe;
  private readonly evictionManager: ModelEvictionManager;
  private readonly sorter: ModelAffinityTaskSorter;
  private readonly groomer: QueueGroomer;
  private readonly governor: ThermalGovernor;
  private readonly telemetryProvider: IHardwareTelemetryProvider;

  private isRunning = false;
  private isPaused = false;
  private drainMode = false;
  private loopTimer: NodeJS.Timeout | null = null;
  private executionHandler: TaskExecutionHandler | null = null;

  private readonly perModelTimeoutMs: Readonly<Record<string, number>>;
  private readonly defaultTimeoutMs: number;

  constructor(options: {
    readonly taskRepo: TaskRepository;
    readonly stageRepo: StageRepository;
    readonly evictionManager: ModelEvictionManager;
    readonly telemetryProvider: IHardwareTelemetryProvider;
    readonly probe?: OllamaStateProbe;
    readonly groomer?: QueueGroomer;
    readonly governor?: ThermalGovernor;
    readonly sorter?: ModelAffinityTaskSorter;
    readonly defaultTimeoutMs?: number;
    readonly perModelTimeoutMs?: Readonly<Record<string, number>>;
  }) {
    this.taskRepo = options.taskRepo;
    this.stageRepo = options.stageRepo;
    this.evictionManager = options.evictionManager;
    this.telemetryProvider = options.telemetryProvider;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 300_000; // 5 minutes default
    this.perModelTimeoutMs = options.perModelTimeoutMs ?? {
      "qwen2.5-coder:3b": 120_000,
      "gemma3:4b-it-qat": 180_000,
      "qwen2.5-coder:7b-instruct-q4_K_M": 240_000,
      "deepseek-r1:8b": 420_000,
      "qwen2.5-coder:14b": 360_000,
      "deepseek-coder-v2:16b": 480_000
    };

    this.mutex = new ExecutionMutex();
    this.probe = options.probe ?? new OllamaStateProbe();
    this.groomer = options.groomer ?? new QueueGroomer();
    this.governor = options.governor ?? new ThermalGovernor();
    this.sorter = options.sorter ?? new ModelAffinityTaskSorter();
  }

  /**
   * Resolves maximum execution timeout in milliseconds for the given model.
   */
  public resolveModelTimeout(model: string): number {
    return this.perModelTimeoutMs[model] ?? this.defaultTimeoutMs;
  }

  /**
   * Registers the callback handler invoked to execute a groomed task.
   */
  public setExecutionHandler(handler: TaskExecutionHandler): void {
    this.executionHandler = handler;
  }

  /**
   * Starts the continuous scheduling loop.
   */
  public start(pollIntervalMs = 2000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.drainMode = false;

    // Recover any tasks left orphaned in RUNNING status from previous daemon sessions
    void this.recoverOrphanedTasks();

    this.loopTimer = setInterval(() => {
      void this.tick();
    }, pollIntervalMs);
  }

  /**
   * Resets any orphaned RUNNING tasks from prior interrupted daemon sessions to PENDING.
   */
  public async recoverOrphanedTasks(): Promise<number> {
    try {
      const allPending = await this.taskRepo.listPending();
      const orphaned = allPending.filter((t) => t.status === "RUNNING");
      for (const task of orphaned) {
        await this.taskRepo.updateStatus(task.id, "PENDING");
      }
      return orphaned.length;
    } catch {
      return 0;
    }
  }

  /**
   * Pauses task processing after the current task finishes.
   */
  public pause(): void {
    this.isPaused = true;
  }

  /**
   * Resumes scheduling from a paused state.
   */
  public resume(): void {
    this.isPaused = false;
  }

  /**
   * Puts scheduler in drain mode: finishes all pending tasks and then cleanly stops.
   */
  public drain(): void {
    this.drainMode = true;
  }

  /**
   * Stops the scheduling daemon cleanly.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  /**
   * Executes a single scheduling evaluation cycle.
   */
  public async tick(): Promise<TaskRecord | null> {
    if (!this.isRunning || this.isPaused || this.mutex.isLocked()) {
      return null;
    }

    const allPending = await this.taskRepo.listPending();
    const pending = allPending.filter((t) => t.status !== "RUNNING");
    if (pending.length === 0) {
      if (this.drainMode) {
        this.stop();
      }
      return null;
    }

    // 1. Acquire single-concurrency APU mutex
    const releaseLock = await this.mutex.acquire();

    try {
      // 2. Query host Ollama currently active model in VRAM
      const activeVramModel = await this.probe.getLoadedModel();

      // 3. Sort pending tasks by Model Affinity & Effective Priority
      const sorted = this.sorter.sort(pending, activeVramModel);
      const targetTask = sorted[0];
      if (!targetTask) return null;

      // 4. Groom task (resolve focus files, scope test command, inject architectural directives)
      const groomed = this.groomer.groom(targetTask);

      let candidateList = targetTask.modelAssigned
        ? [targetTask.modelAssigned]
        : [
            "deepseek-coder-v2:16b",
            "qwen2.5-coder:14b",
            "qwen2.5-coder:7b-instruct-q4_K_M",
            "deepseek-r1:8b",
            "gemma3:4b-it-qat",
            "qwen2.5-coder:3b"
          ];

      // Telemetry heuristic: If APU temperature is warm or elevated (>= 75C), prefer cooler-running lighter model
      try {
        const sample = await this.telemetryProvider.sample();
        if (sample.edgeTempCelsius >= 75 && !targetTask.modelAssigned) {
          candidateList = ["qwen2.5-coder:7b-instruct-q4_K_M", "gemma3:4b-it-qat", "qwen2.5-coder:3b"];
        }
      } catch {
        // ignore
      }

      const selectedModel = await this.evictionManager.selectModel(
        targetTask.role as AgentRole,
        candidateList,
        activeVramModel
      );

      // 6. Check & Apply Thermal Governor Pacing
      const thermalEval = await this.governor.enforcePacing(this.telemetryProvider);
      if (thermalEval.emergencyHalt) {
        console.error(
          `[TaskScheduler] OUCH! THERMAL CUTOFF (${thermalEval.tempCelsius}C >= ${this.governor.emergencyShutdownTemp}C). Halting task queue immediately.`
        );
        this.isPaused = true;
        return null;
      }

      // 7. Transition task state to RUNNING
      console.log(`[TaskScheduler] Dispatching task ${targetTask.id} ('${targetTask.title}') to model '${selectedModel}'`);
      await this.taskRepo.updateStatus(targetTask.id, "RUNNING");
      await this.taskRepo.updateModel(targetTask.id, selectedModel);

      // 8. Dispatch Execution Handler with Per-Model Watchdog Timer
      if (this.executionHandler) {
        const stageStartMs = Date.now();
        const stageId = await this.stageRepo.recordStageStart(targetTask.id, "generation");
        const modelTimeoutMs = this.resolveModelTimeout(selectedModel);

        let watchdogTimer: NodeJS.Timeout | null = null;
        const watchdogPromise = new Promise<never>((_, reject) => {
          watchdogTimer = setTimeout(() => {
            reject(
              new ExecutionTimeoutError(
                `Task execution exceeded allocated timeout of ${modelTimeoutMs}ms for model '${selectedModel}'`,
                modelTimeoutMs,
                targetTask.id,
                selectedModel
              )
            );
          }, modelTimeoutMs);
        });

        try {
          const handlerPromise = this.executionHandler(groomed, selectedModel);
          const result = await Promise.race([handlerPromise, watchdogPromise]);
          if (watchdogTimer) clearTimeout(watchdogTimer);

          const durationMs = Date.now() - stageStartMs;
          const finalStatus = result.success ? "COMPLETED" : "FAILED";
          const actualTps = result.tokensPerSec;
          console.log(`[TaskScheduler] Task ${targetTask.id} finished with status ${finalStatus} in ${durationMs}ms at ${actualTps.toFixed(1)} tok/s`);
          await this.taskRepo.updateStatus(targetTask.id, finalStatus, durationMs, actualTps);
          await this.stageRepo.recordStageCompletion(
            stageId,
            result.success ? "SUCCESS" : "FAILURE",
            result.success ? "Stage completed successfully" : "Stage failed verification",
            0,
            0,
            durationMs
          );

          if (!result.success) {
            await this.taskRepo.incrementFailure(targetTask.id);
          }

          // Record run telemetry in ModelHealthRepository for leaderboard metrics
          try {
            await this.evictionManager.recordRunOutcome(
              selectedModel,
              result.success,
              durationMs,
              actualTps
            );
          } catch {
            // ignore non-critical health recording errors
          }
        } catch (err) {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          const durationMs = Date.now() - stageStartMs;
          const errorMsg = err instanceof Error ? err.message : String(err);
          const classification = FailureClassifier.classify(errorMsg);
          const isTimeout = classification.category === "TIMEOUT" || err instanceof ExecutionTimeoutError;

          console.error(
            `[TaskScheduler] Task ${targetTask.id} threw error [${classification.category}] after ${durationMs}ms:`,
            err
          );
          await this.taskRepo.updateStatus(targetTask.id, "FAILED", durationMs, 0.0);
          await this.taskRepo.incrementFailure(targetTask.id);
          await this.stageRepo.recordStageCompletion(
            stageId,
            "FAILURE",
            isTimeout
              ? `[TIMEOUT]: Execution exceeded maximum watchdog limit of ${modelTimeoutMs}ms. ${errorMsg}`
              : `[${classification.category}]: ${errorMsg}`,
            0,
            0,
            durationMs
          );

          try {
            await this.evictionManager.recordRunOutcome(
              selectedModel,
              false,
              durationMs,
              0.0
            );
          } catch {
            // ignore
          }
        }
      }

      return targetTask;
    } finally {
      releaseLock();
    }
  }
}
