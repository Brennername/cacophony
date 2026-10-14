import type { TaskRepository, StageRepository } from "@cacophony/db";
import type { TaskRecord, AgentRole } from "@cacophony/shared-types";
import { ExecutionMutex } from "./ExecutionMutex.js";
import { OllamaStateProbe } from "./OllamaStateProbe.js";
import { ModelEvictionManager } from "./ModelEvictionManager.js";
import { ModelAffinityTaskSorter } from "./ModelAffinityTaskSorter.js";
import { QueueGroomer, type GroomedTask } from "./QueueGroomer.js";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";
import type { IHardwareTelemetryProvider } from "../telemetry/IHardwareTelemetryProvider.js";
import {
  FailureClassifier,
  ExecutionTimeoutError,
} from "../analytics/FailureClassifier.js";
import type { StreamTapManager } from "../inference/StreamTapManager.js";
import type { TaskRehabilitationService } from "./TaskRehabilitationService.js";
import type {
  DistributedTaskDispatcher,
  TaskPlacementDecision,
} from "./DistributedTaskDispatcher.js";
import { ModelVramCatalog } from "../hardware/ModelVramCatalog.js";
import type { OomPredictiveGuard } from "../hardware/OomPredictiveGuard.js";

export type TaskExecutionResult = {
  success: boolean;
  tokensPerSec: number;
  commitHash?: string | undefined;
  baseCommitHash?: string | undefined;
  failureReason?: string | undefined;
};
export type TaskExecutionHandler = (
  groomed: GroomedTask,
  selectedModel: string,
  signal?: AbortSignal,
) => Promise<TaskExecutionResult>;

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
  private readonly streamTapManager?: StreamTapManager | undefined;
  private readonly rehabilitationService?:
    TaskRehabilitationService | undefined;
  private readonly dispatcher?: DistributedTaskDispatcher | undefined;
  private lastPlacementDecision?: TaskPlacementDecision | undefined;
  private readonly maxRetries: number;
  private readonly vramCatalog: ModelVramCatalog;
  private readonly oomGuard?: OomPredictiveGuard | undefined;
  private ollamaProvider?:
    | {
        unloadModel(model: string): Promise<void>;
        waitForModelEviction?(
          model: string,
          timeoutMs?: number,
        ): Promise<boolean>;
      }
    | undefined;

  private isRunning = false;
  private isPaused = false;
  private drainMode = false;
  private loopTimer: NodeJS.Timeout | null = null;
  private executionHandler: TaskExecutionHandler | null = null;

  private readonly perModelTimeoutMs: Readonly<Record<string, number>>;
  private readonly defaultTimeoutMs: number;
  private readonly noProgressTimeoutMs: number | undefined;
  private readonly autoReplenish: boolean;
  private seedLoader?:
    import("./TaskcadeSeedLoader.js").TaskcadeSeedLoader | undefined;
  private cachedLoadedModels: readonly string[] | null = null;
  private lastLoadedModelsTime = 0;
  private static readonly LOADED_MODELS_CACHE_TTL_MS = 5000;

  constructor(options: {
    readonly taskRepo: TaskRepository;
    readonly stageRepo: StageRepository;
    readonly evictionManager: ModelEvictionManager;
    readonly telemetryProvider: IHardwareTelemetryProvider;
    readonly streamTapManager?: StreamTapManager;
    readonly probe?: OllamaStateProbe;
    readonly groomer?: QueueGroomer;
    readonly governor?: ThermalGovernor;
    readonly sorter?: ModelAffinityTaskSorter;
    readonly dispatcher?: DistributedTaskDispatcher;
    readonly vramCatalog?: ModelVramCatalog;
    readonly oomGuard?: OomPredictiveGuard;
    readonly ollamaProvider?: {
      unloadModel(model: string): Promise<void>;
      waitForModelEviction?(model: string, timeoutMs?: number): Promise<boolean>;
    };
    readonly defaultTimeoutMs?: number;
    readonly noProgressTimeoutMs?: number;
    readonly perModelTimeoutMs?: Readonly<Record<string, number>>;
    readonly autoReplenish?: boolean;
    readonly rehabilitationService?: TaskRehabilitationService;
    readonly maxRetries?: number;
  }) {
    this.taskRepo = options.taskRepo;
    this.stageRepo = options.stageRepo;
    this.evictionManager = options.evictionManager;
    this.telemetryProvider = options.telemetryProvider;
    this.streamTapManager = options.streamTapManager;
    this.rehabilitationService = options.rehabilitationService;
    this.dispatcher = options.dispatcher;
    this.vramCatalog = options.vramCatalog ?? new ModelVramCatalog();
    this.oomGuard = options.oomGuard;
    this.ollamaProvider = options.ollamaProvider;
    this.maxRetries = options.maxRetries ?? 3;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 480_000; // 8 minutes default
    // An inactivity cutoff is opt-in. Some models can legitimately spend a long
    // time without emitting tokens or stage events; the hard model deadline is
    // the production safety limit and must not be preempted by a shorter idle timer.
    this.noProgressTimeoutMs = options.noProgressTimeoutMs;
    this.perModelTimeoutMs = options.perModelTimeoutMs ?? {
      "qwen2.5-coder:3b": 360_000,
      "gemma3:4b-it-qat": 420_000,
      "qwen2.5-coder:7b": 600_000,
      "qwen2.5-coder:7b-instruct-q4_K_M": 600_000,
      "deepseek-r1:8b": 840_000,
      "qwen2.5-coder:14b": 780_000,
      "deepseek-coder-v2:16b": 840_000,
    };

    this.mutex = new ExecutionMutex();
    this.probe = options.probe ?? new OllamaStateProbe();
    this.groomer = options.groomer ?? new QueueGroomer();
    this.governor = options.governor ?? new ThermalGovernor();
    this.sorter = options.sorter ?? new ModelAffinityTaskSorter();
    this.autoReplenish =
      options.autoReplenish ?? process.env["AUTO_REPLENISH_QUEUE"] !== "false";
  }

  /**
   * Normalizes model aliases, tags with context suffixes, and maps to installed host models.
   * Prevents HTTP 404 errors when tasks specify model tag variations.
   */
  public static normalizeModelName(rawModel: string): string {
    const trimmed = rawModel.trim();
    const aliasMap: Record<string, string> = {
      "deepseek-r1:8b-4k": "deepseek-r1:8b",
      "gemma3:4b-it-qat-4k": "gemma3:4b-it-qat",
      "gemma3:4b": "gemma3:4b-it-qat",
      "qwen2.5-coder:3b-4k": "qwen2.5-coder:3b",
      "qwen2.5-coder:7b-4k": "qwen2.5-coder:7b",
      "qwen2.5-coder:14b-4k": "qwen2.5-coder:14b",
      "deepseek-coder-v2:16b-4k": "deepseek-coder-v2:16b",
    };

    if (aliasMap[trimmed]) {
      return aliasMap[trimmed];
    }

    const stripped = trimmed.replace(/-(?:4|8|16|32)k$/i, "");
    if (aliasMap[stripped]) {
      return aliasMap[stripped];
    }

    return trimmed;
  }

  /**
   * Resolves maximum execution timeout in milliseconds for the given model.
   */
  public resolveModelTimeout(model: string): number {
    const normalized = TaskScheduler.normalizeModelName(model);
    return (
      this.perModelTimeoutMs[normalized] ??
      this.perModelTimeoutMs[model] ??
      this.defaultTimeoutMs
    );
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
      void this.tick(false);
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
   * Gets the configured DistributedTaskDispatcher, if any.
   */
  public getDispatcher(): DistributedTaskDispatcher | undefined {
    return this.dispatcher;
  }

  /**
   * Sets or updates the DistributedTaskDispatcher at runtime.
   */
  public setDispatcher(dispatcher: DistributedTaskDispatcher): void {
    (this as any).dispatcher = dispatcher;
  }

  /**
   * Retrieves the most recent distributed task placement decision.
   */
  public getLastPlacementDecision(): TaskPlacementDecision | undefined {
    return this.lastPlacementDecision;
  }

  /**
   * Sets or updates the inference/Ollama provider used for explicit model unloads.
   */
  public setOllamaProvider(provider: {
    unloadModel(model: string): Promise<void>;
    waitForModelEviction?(model: string, timeoutMs?: number): Promise<boolean>;
  }): void {
    this.ollamaProvider = provider;
  }

  /**
   * Prepares VRAM environment before loading a model for inference (T68.4.2).
   * Triggers explicit model unload if switching to a disparate model architecture
   * when available free VRAM headroom is insufficient for co-residency.
   *
   * @param targetModel - Target model architecture requested for execution.
   * @param activeVramModelOverride - Optional active model identifier.
   * @returns boolean true if explicit model unload was executed, false otherwise.
   */
  public async prepareModelExecution(
    targetModel: string,
    activeVramModelOverride?: string | null,
  ): Promise<boolean> {
    const activeVramModel =
      activeVramModelOverride !== undefined
        ? activeVramModelOverride
        : (await this.queryLoadedModels())[0] ?? null;

    if (
      !activeVramModel ||
      activeVramModel === "None" ||
      activeVramModel === targetModel
    ) {
      return false;
    }

    // Determine model architecture families (e.g. qwen vs gemma vs deepseek)
    const targetFamily =
      targetModel.split(":")[0]?.split("-")[0]?.toLowerCase() ?? "";
    const activeFamily =
      activeVramModel.split(":")[0]?.split("-")[0]?.toLowerCase() ?? "";
    const isDisparate = targetFamily !== activeFamily;

    // Estimate memory requirements
    const targetRequiredMb = this.vramCatalog.estimateTotalVramMb(
      targetModel,
      4096,
    );
    const activeRequiredMb = this.vramCatalog.estimateTotalVramMb(
      activeVramModel,
      4096,
    );
    const totalRequiredMb = targetRequiredMb + activeRequiredMb;

    let hasSufficientHeadroom = false;
    if (typeof this.telemetryProvider.checkVramHeadroom === "function") {
      hasSufficientHeadroom = await this.telemetryProvider.checkVramHeadroom(
        totalRequiredMb,
      );
    } else {
      try {
        const sample = await this.telemetryProvider.sample();
        if (sample.vramTotalBytes > 0) {
          const freeMb = Math.floor(
            Math.max(0, sample.vramTotalBytes - sample.vramUsedBytes) /
              (1024 * 1024),
          );
          hasSufficientHeadroom = freeMb >= targetRequiredMb;
        }
      } catch {
        hasSufficientHeadroom = true;
      }
    }

    if (isDisparate && !hasSufficientHeadroom) {
      console.log(
        `[TaskScheduler] Disparate architecture switch (${activeVramModel} -> ${targetModel}) with constrained VRAM. Triggering explicit unload.`,
      );
      if (this.ollamaProvider) {
        try {
          await this.ollamaProvider.unloadModel(activeVramModel);
          if (typeof this.ollamaProvider.waitForModelEviction === "function") {
            await this.ollamaProvider.waitForModelEviction(
              activeVramModel,
              10000,
            );
          }
          this.cachedLoadedModels = null;
          return true;
        } catch (err) {
          console.warn(
            `[TaskScheduler] Explicit model unload for '${activeVramModel}' failed:`,
            err,
          );
        }
      }
    }

    return false;
  }

  /**
   * Queries host Ollama HTTP endpoint for currently loaded models in VRAM (T68.3.1).
   * Caches results with a 5-second TTL to avoid redundant HTTP requests during high-frequency dispatch cycles.
   *
   * @param forceRefresh When true, bypasses the 5-second cache and executes an immediate probe.
   * @returns Array of loaded model names (normalized), or empty array if no model is loaded.
   */
  public async queryLoadedModels(
    forceRefresh = false,
  ): Promise<readonly string[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.cachedLoadedModels !== null &&
      now - this.lastLoadedModelsTime < TaskScheduler.LOADED_MODELS_CACHE_TTL_MS
    ) {
      return this.cachedLoadedModels;
    }

    const activeModel = await this.probe.getLoadedModel();
    const models = activeModel ? [activeModel] : [];
    this.cachedLoadedModels = models;
    this.lastLoadedModelsTime = now;
    return models;
  }

  /**
   * Checks whether a task can be safely dispatched given current VRAM headroom (T68.2.3).
   * Defers dispatching tasks if estimated VRAM requirement + SAFETY_MARGIN exceeds free VRAM.
   *
   * @param task - Candidate task record.
   * @param modelName - Specific model identifier to evaluate.
   * @returns boolean true if dispatch is allowed, false if deferred due to constrained VRAM headroom.
   */
  public async canDispatch(
    task: TaskRecord,
    modelName?: string,
  ): Promise<boolean> {
    const model = modelName ?? task.modelAssigned ?? "qwen2.5-coder:7b";
    const requiredMb = this.vramCatalog.estimateTotalVramMb(model, 4096);

    // If predictive OOM guard detects severe host memory pressure (< 1.5 GB available), defer dispatch (T68.6.2)
    if (this.oomGuard) {
      const pressure = this.oomGuard.evaluateSystemMemoryPressure();
      if (pressure.isUnderPressure) {
        return false;
      }
    }

    // If distributed dispatcher is configured and placement targets a remote node,
    // execution is handled by remote host resources (T86.2)
    if (this.dispatcher) {
      const placement = this.dispatcher.selectPlacement({
        taskId: task.id,
        model,
        estimatedVramMb: requiredMb,
        priority: task.priority,
      });
      if (!placement.isLocal) {
        return true;
      }
    }

    // If telemetry provider implements checkVramHeadroom, delegate directly (T68.2.1, T68.2.2)
    if (typeof this.telemetryProvider.checkVramHeadroom === "function") {
      const result = this.telemetryProvider.checkVramHeadroom(requiredMb);
      return typeof result === "boolean" ? result : await result;
    }

    // Fallback to getVramMetrics if supported
    if (typeof this.telemetryProvider.getVramMetrics === "function") {
      try {
        const metrics = await this.telemetryProvider.getVramMetrics();
        if (metrics.totalBytes > 512 * 1024 * 1024) {
          const freeMb = Math.floor(metrics.freeBytes / (1024 * 1024));
          return freeMb >= requiredMb;
        }
      } catch {
        // Continue to sample() fallback
      }
    }

    // Fallback to sample()
    try {
      const sample = await this.telemetryProvider.sample();
      if (sample.vramTotalBytes > 512 * 1024 * 1024) {
        const freeBytes = Math.max(
          0,
          sample.vramTotalBytes - sample.vramUsedBytes,
        );
        const freeMb = Math.floor(freeBytes / (1024 * 1024));
        return freeMb >= requiredMb;
      }
    } catch {
      // Allow dispatch if sampling fails in non-hardware environment
      return true;
    }

    return true;
  }

  /**
   * Resolves target model candidate for a task given role, assignments, failure history,
   * thermal load, and model eviction manager.
   *
   * @param task - Candidate task record.
   * @param activeVramModel - Model currently loaded in host VRAM.
   * @returns Selected model identifier.
   */
  public async selectCandidateModel(
    task: TaskRecord,
    activeVramModel: string | null,
  ): Promise<string> {
    // Explicit model pinning via metadataHints (T72.2.3)
    if (task.metadataHints?.modelAffinity) {
      return TaskScheduler.normalizeModelName(task.metadataHints.modelAffinity);
    }

    const normalizedAssigned = task.modelAssigned
      ? TaskScheduler.normalizeModelName(task.modelAssigned)
      : null;


    const role = task.role as AgentRole;
    let candidateList: string[];

    if (normalizedAssigned) {
      if (
        normalizedAssigned.includes("r1") &&
        role !== "architect" &&
        role !== "reviewer"
      ) {
        candidateList = [
          "qwen2.5-coder:7b-instruct-q4_K_M",
          "qwen2.5-coder:7b",
          "gemma3:4b-it-qat",
          "qwen2.5-coder:14b",
        ];
      } else if (
        normalizedAssigned === "qwen2.5-coder:3b" &&
        role !== "architect" &&
        role !== "reviewer"
      ) {
        candidateList = [
          "qwen2.5-coder:7b-instruct-q4_K_M",
          "qwen2.5-coder:7b",
          "gemma3:4b-it-qat",
        ];
      } else if (
        task.failureCount > 0 &&
        role !== "architect" &&
        role !== "reviewer"
      ) {
        candidateList = [
          "qwen2.5-coder:7b-instruct-q4_K_M",
          "qwen2.5-coder:7b",
          "gemma3:4b-it-qat",
          "qwen2.5-coder:14b",
          normalizedAssigned,
        ].filter((m) => m !== "qwen2.5-coder:3b");
      } else {
        candidateList = [normalizedAssigned];
      }
    } else if (role === "architect" || role === "reviewer") {
      candidateList = [
        "deepseek-r1:8b",
        "qwen2.5-coder:14b",
        "qwen2.5-coder:7b-instruct-q4_K_M",
        "qwen2.5-coder:7b",
      ];
    } else {
      candidateList = [
        "qwen2.5-coder:7b-instruct-q4_K_M",
        "qwen2.5-coder:7b",
        "gemma3:4b-it-qat",
        "qwen2.5-coder:14b",
        "deepseek-coder-v2:16b",
      ];
    }

    try {
      const sample = await this.telemetryProvider.sample();
      if (sample.edgeTempCelsius >= 75 && !normalizedAssigned) {
        candidateList = [
          "qwen2.5-coder:7b-instruct-q4_K_M",
          "gemma3:4b-it-qat",
        ];
      }
    } catch {
      // ignore
    }

    if (role !== "architect" && role !== "reviewer") {
      candidateList = candidateList.filter((m) => m !== "qwen2.5-coder:3b");
      if (candidateList.length === 0) {
        candidateList = [
          "qwen2.5-coder:7b-instruct-q4_K_M",
          "gemma3:4b-it-qat",
        ];
      }
    }

    return this.evictionManager.selectModel(
      task.role as AgentRole,
      candidateList,
      activeVramModel,
    );
  }

  /**
   * Executes a single scheduling evaluation cycle.
   * If force is true, runs even if the continuous background polling loop is stopped.
   */
  public async tick(force = true): Promise<TaskRecord | null> {
    if ((!this.isRunning && !force) || this.isPaused || this.mutex.isLocked()) {
      return null;
    }

    const allPending = await this.taskRepo.listPending();
    let pending = allPending.filter((t) => t.status !== "RUNNING");

    // Guard: reconcile and transition tasks already marked completed in taskcade.md or taskcade-history.md
    if (pending.length > 0) {
      try {
        if (!this.seedLoader) {
          const { TaskcadeSeedLoader } =
            await import("./TaskcadeSeedLoader.js");
          this.seedLoader = new TaskcadeSeedLoader();
        }
        const completedIds = await this.seedLoader.getCompletedTaskIds();
        if (completedIds.size > 0) {
          const uncompleted: TaskRecord[] = [];
          for (const t of pending) {
            const normId = t.id.toLowerCase();
            const shortId = normId.replace("taskcade-", "");
            const codeMatch = t.title.match(/^(T\d+\.\d+\.\d+):/i);
            const taskCode = codeMatch ? codeMatch[1]!.toLowerCase() : null;
            if (
              completedIds.has(normId) ||
              completedIds.has(shortId) ||
              (taskCode && completedIds.has(taskCode))
            ) {
              await this.taskRepo.updateStatus(
                t.id,
                "COMPLETED",
                t.durationMs || 1000,
                t.tokensPerSec || 6.0,
              );
            } else {
              uncompleted.push(t);
            }
          }
          pending = uncompleted;
        }
      } catch {
        // Non-fatal if seedLoader is unavailable in test environments
      }
    }

    if (pending.length === 0) {
      if (this.autoReplenish && !this.drainMode) {
        try {
          // 1. Automatically requeue failed tasks under the maximum retry threshold (failure_count < 3)
          if (typeof this.taskRepo.retryFailedTasks === "function") {
            const requeuedCount = await this.taskRepo.retryFailedTasks(
              undefined,
              false,
            );
            if (requeuedCount > 0) {
              console.log(
                `[TaskScheduler] Automatically requeued ${requeuedCount} failed tasks for retry`,
              );
              const refreshed = await this.taskRepo.listPending();
              pending = refreshed.filter((t) => t.status !== "RUNNING");
            }
          }

          // 2. If still empty, automatically seed uncompleted tasks from docs/taskcade.md
          if (pending.length === 0) {
            if (!this.seedLoader) {
              const { TaskcadeSeedLoader } =
                await import("./TaskcadeSeedLoader.js");
              this.seedLoader = new TaskcadeSeedLoader();
            }
            const uncompletedTasks = await this.seedLoader.loadTasks({
              limit: 50,
            });
            let seededCount = 0;
            for (const t of uncompletedTasks) {
              const res = await this.taskRepo.createIfNotExists(t);
              if (res.created) seededCount++;
            }
            if (seededCount > 0) {
              console.log(
                `[TaskScheduler] Automatically seeded ${seededCount} uncompleted tasks from taskcade.md`,
              );
              const refreshed = await this.taskRepo.listPending();
              pending = refreshed.filter((t) => t.status !== "RUNNING");
            }
          }
        } catch {
          // Gracefully continue if replenishment fails in test environments
        }
      }

      if (pending.length === 0) {
        if (this.drainMode) {
          this.stop();
        }
        return null;
      }
    }

    // 1. Acquire single-concurrency APU mutex
    const releaseLock = await this.mutex.acquire();

    try {
      // 2. Query host Ollama currently active model in VRAM (cached with 5-second TTL per T68.3.1)
      const loadedModels = await this.queryLoadedModels();
      const activeVramModel = loadedModels.length > 0 ? loadedModels[0]! : null;

      // 3. Sort pending tasks by Model Affinity & Effective Priority (T68.3.2)
      let sorted = this.sorter.sort(pending, activeVramModel);
      // Apply starvation cap (max 5 consecutive warm executions) to interleave non-warm candidates (T68.3.3)
      sorted = this.groomer.applyStarvationCap(sorted, activeVramModel, 5);
      if (sorted.length === 0) return null;

      let targetTask: TaskRecord | null = null;
      let selectedModel: string | null = null;

      // Evaluate tasks in affinity order, verifying VRAM headroom per candidate (T68.2.3)
      for (const candidateTask of sorted) {
        const candidateModel = await this.selectCandidateModel(
          candidateTask,
          activeVramModel,
        );
        if (await this.canDispatch(candidateTask, candidateModel)) {
          targetTask = candidateTask;
          selectedModel = candidateModel;
          break;
        } else {
          console.warn(
            `[TaskScheduler] Deferring candidate task ${candidateTask.id} (${candidateModel}): insufficient VRAM headroom`,
          );
        }
      }

      if (!targetTask || !selectedModel) {
        return null;
      }

      // 3b. Pre-dispatch safeguard: ensure targetTask was not completed in taskcade.md or history
      if (this.seedLoader) {
        try {
          const completedIds = await this.seedLoader.getCompletedTaskIds();
          const normalizedId = targetTask.id.toLowerCase();
          const shortId = normalizedId.replace("taskcade-", "");
          const taskCodeMatch = targetTask.title.match(/^(T\d+\.\d+\.\d+):/i);
          const taskCode = taskCodeMatch
            ? taskCodeMatch[1]!.toLowerCase()
            : null;

          if (
            completedIds.has(normalizedId) ||
            completedIds.has(shortId) ||
            (taskCode && completedIds.has(taskCode))
          ) {
            await this.taskRepo.updateStatus(
              targetTask.id,
              "COMPLETED",
              targetTask.durationMs || 1000,
              targetTask.tokensPerSec || 6.0,
            );
            return targetTask;
          }
        } catch {
          // Non-fatal
        }
      }

      // 4. Groom task (resolve focus files, scope test command, inject architectural directives)
      const groomed = this.groomer.groom(targetTask);
      if ((groomed.preflightIssues?.length ?? 0) > 0) {
        const message = groomed.preflightIssues!.join(" ");
        const preflightStage = await this.stageRepo.recordStageStart(
          targetTask.id,
          "planning",
        );
        await this.stageRepo.recordStageCompletion(
          preflightStage,
          "FAILURE",
          message,
          0,
          0,
          0,
        );
        await this.taskRepo.updateStatus(targetTask.id, "FAILED");
        console.warn(
          `[TaskScheduler] Preflight rejected task ${targetTask.id}: ${message}`,
        );
        return targetTask;
      }

      // 5b. Evaluate Distributed Fleet Placement for compute-intensive tasks (T86.2.2)
      if (this.dispatcher) {
        this.lastPlacementDecision = this.dispatcher.selectPlacement({
          taskId: targetTask.id,
          model: selectedModel,
          priority: targetTask.priority,
        });
        if (!this.lastPlacementDecision.isLocal) {
          console.log(
            `[TaskScheduler] Offloading compute-intensive task ${targetTask.id} (${selectedModel}) to remote fleet node '${this.lastPlacementDecision.nodeId}' (${this.lastPlacementDecision.targetHost ?? "remote"}:${this.lastPlacementDecision.targetPort ?? 24072}): ${this.lastPlacementDecision.reason}`,
          );
        } else {
          console.log(
            `[TaskScheduler] Retaining task ${targetTask.id} (${selectedModel}) locally on orchestrator node: ${this.lastPlacementDecision.reason}`,
          );
        }
      }

      // 6. Check & Apply Thermal Governor Pacing
      const thermalEval = await this.governor.enforcePacing(
        this.telemetryProvider,
      );
      if (thermalEval.emergencyHalt) {
        console.error(
          `[TaskScheduler] OUCH! THERMAL CUTOFF (${thermalEval.tempCelsius}C >= ${this.governor.emergencyShutdownTemp}C). Halting task queue immediately.`,
        );
        this.isPaused = true;
        return null;
      }

      // 6b. Explicit model unload on disparate architecture shift under constrained VRAM (T68.4.2)
      await this.prepareModelExecution(selectedModel, activeVramModel);

      // 7. Transition task state to RUNNING
      console.log(
        `[TaskScheduler] Dispatching task ${targetTask.id} ('${targetTask.title}') to model '${selectedModel}'`,
      );
      await this.taskRepo.updateStatus(targetTask.id, "RUNNING");
      await this.taskRepo.updateModel(targetTask.id, selectedModel);

      // 8. Dispatch Execution Handler with Per-Model Watchdog Timer
      if (this.executionHandler) {
        const stageStartMs = Date.now();
        const stageId = await this.stageRepo.recordStageStart(
          targetTask.id,
          "generation",
        );
        const modelTimeoutMs = this.resolveModelTimeout(selectedModel);

        const abortController = new AbortController();
        let watchdogTimer: NodeJS.Timeout | null = null;
        let progressTimer: NodeJS.Timeout | null = null;
        const watchdogPromise = new Promise<never>((_, reject) => {
          watchdogTimer = setTimeout(() => {
            abortController.abort();
            reject(
              new ExecutionTimeoutError(
                `Task execution exceeded allocated timeout of ${modelTimeoutMs}ms for model '${selectedModel}'`,
                modelTimeoutMs,
                targetTask.id,
                selectedModel,
              ),
            );
          }, modelTimeoutMs);
        });
        const progressTimeoutMs =
          this.noProgressTimeoutMs === undefined
            ? undefined
            : Math.min(this.noProgressTimeoutMs, modelTimeoutMs);
        const progressPromise =
          this.streamTapManager && progressTimeoutMs !== undefined
            ? new Promise<never>((_, reject) => {
                let lastProgressAt = Date.now();
                let lastActivityAt = this.streamTapManager?.getLastActivityAt(
                  targetTask.id,
                );
                progressTimer = setInterval(
                  () => {
                    const currentActivityAt =
                      this.streamTapManager?.getLastActivityAt(targetTask.id);
                    if (
                      currentActivityAt !== undefined &&
                      currentActivityAt !== lastActivityAt
                    ) {
                      lastActivityAt = currentActivityAt;
                      lastProgressAt = Date.now();
                    }
                    if (Date.now() - lastProgressAt >= progressTimeoutMs) {
                      if (progressTimer) clearInterval(progressTimer);
                      abortController.abort();
                      reject(
                        new ExecutionTimeoutError(
                          `Task produced no token or pipeline-stage progress for ${progressTimeoutMs}ms (hard limit ${modelTimeoutMs}ms)`,
                          progressTimeoutMs,
                          targetTask.id,
                          selectedModel,
                        ),
                      );
                    }
                  },
                  Math.min(
                    30_000,
                    Math.max(10, Math.floor(progressTimeoutMs / 4)),
                  ),
                );
              })
            : new Promise<never>(() => {});

        try {
          const handlerPromise = this.executionHandler(
            groomed,
            selectedModel,
            abortController.signal,
          );
          const result = await Promise.race([
            handlerPromise,
            watchdogPromise,
            progressPromise,
          ]);
          if (watchdogTimer) clearTimeout(watchdogTimer);
          if (progressTimer) clearInterval(progressTimer);

          const durationMs = Date.now() - stageStartMs;
          const actualTps = result.tokensPerSec;

          if (result.commitHash) {
            await this.taskRepo.updateCommitAttribution(
              targetTask.id,
              result.commitHash,
              result.baseCommitHash,
            );
          }

          if (result.success) {
            console.log(
              `[TaskScheduler] Task ${targetTask.id} finished with status COMPLETED in ${durationMs}ms at ${actualTps.toFixed(1)} tok/s`,
            );
            await this.taskRepo.updateStatus(
              targetTask.id,
              "COMPLETED",
              durationMs,
              actualTps,
            );
            await this.stageRepo.recordStageCompletion(
              stageId,
              "SUCCESS",
              "Stage completed successfully",
              0,
              0,
              durationMs,
            );
          } else {
            const failureReason =
              result.failureReason || "Stage failed verification";
            const newFailureCount = await this.taskRepo.incrementFailure(
              targetTask.id,
            );

            await this.stageRepo.recordStageCompletion(
              stageId,
              "FAILURE",
              failureReason,
              0,
              0,
              durationMs,
            );

            const effectiveFailureCount =
              typeof newFailureCount === "number"
                ? newFailureCount
                : targetTask.failureCount + 1;

            if (effectiveFailureCount < this.maxRetries) {
              console.log(
                `[TaskScheduler] Task ${targetTask.id} attempt ${effectiveFailureCount}/${this.maxRetries} failed. Requeuing for autonomous remediation.`,
              );
              await this.taskRepo.updateStatus(
                targetTask.id,
                "PENDING",
                durationMs,
                actualTps,
              );
              if (typeof this.taskRepo.updateLogSnippet === "function") {
                await this.taskRepo.updateLogSnippet(
                  targetTask.id,
                  `[Attempt ${effectiveFailureCount}/${this.maxRetries} Failed]: ${failureReason}`,
                );
              }
            } else {
              console.log(
                `[TaskScheduler] Task ${targetTask.id} reached max retries (${effectiveFailureCount}/${this.maxRetries}). Marking FAILED and triggering rehabilitation.`,
              );
              await this.taskRepo.updateStatus(
                targetTask.id,
                "FAILED",
                durationMs,
                actualTps,
              );
              if (typeof this.taskRepo.updateRehabStatus === "function") {
                await this.taskRepo.updateRehabStatus(
                  targetTask.id,
                  "PENDING_REHAB",
                );
              }
              if (this.rehabilitationService) {
                try {
                  await this.rehabilitationService.rehabilitateTask(
                    targetTask,
                    failureReason,
                    result.commitHash,
                  );
                } catch (rehabErr) {
                  console.error(
                    `[TaskScheduler] Rehabilitation failed for task ${targetTask.id}:`,
                    rehabErr,
                  );
                }
              }
            }
          }

          // Record run telemetry in ModelHealthRepository for leaderboard metrics
          try {
            await this.evictionManager.recordRunOutcome(
              selectedModel,
              result.success,
              durationMs,
              actualTps,
            );
          } catch {
            // ignore non-critical health recording errors
          }
        } catch (err) {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          if (progressTimer) clearInterval(progressTimer);
          abortController.abort();
          const durationMs = Date.now() - stageStartMs;
          const errorMsg = err instanceof Error ? err.message : String(err);
          const classification = FailureClassifier.classify(
            err instanceof Error ? err : errorMsg,
          );
          const isTimeout =
            classification.category === "TIMEOUT" ||
            err instanceof ExecutionTimeoutError;

          console.error(
            `[TaskScheduler] Task ${targetTask.id} threw error [${classification.category}] after ${durationMs}ms:`,
            err,
          );

          // Retrieve any measured tokensPerSec from completed stages (e.g. Stage 2 Generation) or live stream buffer
          let recordedTps = 0.0;
          try {
            const recordedStages = await this.stageRepo.getStagesForTask(
              targetTask.id,
            );
            const genStage = recordedStages.find(
              (s) => s.stageName === "generation" && s.tokensReceived > 0,
            );
            if (genStage && genStage.durationMs > 0) {
              recordedTps = Number(
                (
                  (genStage.tokensReceived / genStage.durationMs) *
                  1000
                ).toFixed(2),
              );
            } else if (this.streamTapManager) {
              const buffer = this.streamTapManager.getBuffer(targetTask.id);
              if (buffer.length > 0 && durationMs > 0) {
                const estimatedTokens = Math.max(
                  1,
                  Math.round(buffer.length / 3.8),
                );
                recordedTps = Number(
                  ((estimatedTokens / durationMs) * 1000).toFixed(2),
                );
              }
            }
          } catch {
            // non-fatal
          }

          const newFailureCount = await this.taskRepo.incrementFailure(
            targetTask.id,
          );
          const effectiveFailureCount =
            typeof newFailureCount === "number"
              ? newFailureCount
              : targetTask.failureCount + 1;
          const failureReason = isTimeout
            ? `[TIMEOUT]: ${errorMsg}`
            : `[${classification.category}]: ${errorMsg}`;

          await this.stageRepo.recordStageCompletion(
            stageId,
            "FAILURE",
            failureReason,
            0,
            0,
            durationMs,
          );

          if (effectiveFailureCount < this.maxRetries) {
            console.log(
              `[TaskScheduler] Task ${targetTask.id} caught error attempt ${effectiveFailureCount}/${this.maxRetries}. Requeuing for autonomous retry.`,
            );
            await this.taskRepo.updateStatus(
              targetTask.id,
              "PENDING",
              durationMs,
              recordedTps,
            );
            if (typeof this.taskRepo.updateLogSnippet === "function") {
              await this.taskRepo.updateLogSnippet(
                targetTask.id,
                `[Attempt ${effectiveFailureCount}/${this.maxRetries} Error]: ${failureReason}`,
              );
            }
          } else {
            console.log(
              `[TaskScheduler] Task ${targetTask.id} reached max retries on error (${effectiveFailureCount}/${this.maxRetries}). Marking FAILED and triggering rehabilitation.`,
            );
            await this.taskRepo.updateStatus(
              targetTask.id,
              "FAILED",
              durationMs,
              recordedTps,
            );
            if (typeof this.taskRepo.updateRehabStatus === "function") {
              await this.taskRepo.updateRehabStatus(
                targetTask.id,
                "PENDING_REHAB",
              );
            }
            if (this.rehabilitationService) {
              try {
                await this.rehabilitationService.rehabilitateTask(
                  targetTask,
                  failureReason,
                );
              } catch (rehabErr) {
                console.error(
                  `[TaskScheduler] Rehabilitation failed for task ${targetTask.id}:`,
                  rehabErr,
                );
              }
            }
          }

          try {
            await this.evictionManager.recordRunOutcome(
              selectedModel,
              false,
              durationMs,
              recordedTps,
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
