import type { TaskRepository, StageRepository } from "@cacophony/db";
import type { TaskRecord, AgentRole } from "@cacophony/shared-types";
import { ExecutionMutex } from "./ExecutionMutex.js";
import { OllamaStateProbe } from "./OllamaStateProbe.js";
import { ModelEvictionManager } from "./ModelEvictionManager.js";
import { ModelAffinityTaskSorter } from "./ModelAffinityTaskSorter.js";
import { QueueGroomer, type GroomedTask } from "./QueueGroomer.js";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";
import type { IHardwareTelemetryProvider } from "../telemetry/IHardwareTelemetryProvider.js";

export type TaskExecutionHandler = (groomed: GroomedTask, selectedModel: string) => Promise<boolean>;

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

  constructor(options: {
    readonly taskRepo: TaskRepository;
    readonly stageRepo: StageRepository;
    readonly evictionManager: ModelEvictionManager;
    readonly telemetryProvider: IHardwareTelemetryProvider;
    readonly probe?: OllamaStateProbe;
    readonly groomer?: QueueGroomer;
    readonly governor?: ThermalGovernor;
    readonly sorter?: ModelAffinityTaskSorter;
  }) {
    this.taskRepo = options.taskRepo;
    this.stageRepo = options.stageRepo;
    this.evictionManager = options.evictionManager;
    this.telemetryProvider = options.telemetryProvider;

    this.mutex = new ExecutionMutex();
    this.probe = options.probe ?? new OllamaStateProbe();
    this.groomer = options.groomer ?? new QueueGroomer();
    this.governor = options.governor ?? new ThermalGovernor();
    this.sorter = options.sorter ?? new ModelAffinityTaskSorter();
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

    this.loopTimer = setInterval(() => {
      void this.tick();
    }, pollIntervalMs);
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

    const pending = await this.taskRepo.listPending();
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

      // 5. Select Model with Eviction & Weighted Random Roulette
      const candidateList = targetTask.modelAssigned
        ? [targetTask.modelAssigned]
        : ["qwen2.5-coder:7b", "deepseek-r1:8b", "gemma3:4b"];

      const selectedModel = await this.evictionManager.selectModel(
        targetTask.role as AgentRole,
        candidateList,
        activeVramModel
      );

      // 6. Check & Apply Thermal Governor Pacing
      await this.governor.enforcePacing(this.telemetryProvider);

      // 7. Transition task state to RUNNING
      await this.taskRepo.updateStatus(targetTask.id, "RUNNING");
      await this.taskRepo.updateModel(targetTask.id, selectedModel);

      // 8. Dispatch Execution Handler (if registered)
      if (this.executionHandler) {
        const stageStartMs = Date.now();
        const stageId = await this.stageRepo.recordStageStart(targetTask.id, "generation");

        try {
          const success = await this.executionHandler(groomed, selectedModel);
          const durationMs = Date.now() - stageStartMs;
          const finalStatus = success ? "COMPLETED" : "FAILED";
          await this.taskRepo.updateStatus(targetTask.id, finalStatus);
          await this.stageRepo.recordStageCompletion(
            stageId,
            success ? "SUCCESS" : "FAILURE",
            success ? "Stage completed successfully" : "Stage failed verification",
            0,
            0,
            durationMs
          );

          if (!success) {
            await this.taskRepo.incrementFailure(targetTask.id);
          }
        } catch (err) {
          const durationMs = Date.now() - stageStartMs;
          await this.taskRepo.updateStatus(targetTask.id, "FAILED");
          await this.taskRepo.incrementFailure(targetTask.id);
          await this.stageRepo.recordStageCompletion(
            stageId,
            "FAILURE",
            err instanceof Error ? err.message : String(err),
            0,
            0,
            durationMs
          );
        }
      }

      return targetTask;
    } finally {
      releaseLock();
    }
  }
}
