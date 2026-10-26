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
import { StructuredLogger } from "../telemetry/StructuredLogger.js";
import type {
  VramPrefetchCoordinator,
  IModelPredictor,
} from "../inference/VramPrefetchCoordinator.js";

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
export class TaskScheduler implements IModelPredictor {
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
  private readonly oomGuard?: import("../hardware/OomPredictiveGuard.js").OomPredictiveGuard | undefined;
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
  private isStopping = false;
  private drainMode = false;
  private loopTimer: NodeJS.Timeout | null = null;
  private executionHandler: TaskExecutionHandler | null = null;
  private activeAbortController?: AbortController | undefined;
  private vramPrefetchCoordinator?: VramPrefetchCoordinator | undefined;
  private currentRunningTask?: TaskRecord | undefined;
  private currentRunningModel?: string | undefined;
  private readonly logger = new StructuredLogger("TaskScheduler");

  private readonly perModelTimeoutMs: Readonly<Record<string, number>>;
  private readonly defaultTimeoutMs: number;
  private readonly noProgressTimeoutMs: number | undefined;
  private readonly autoReplenish: boolean;
  private seedLoader?:
    import("./TaskcadeSeedLoader.js").TaskcadeSeedLoader | undefined;
  private cachedLoadedModels: readonly string[] | null = null;
  private lastLoadedModelsTime = 0;
  private static readonly LOADED_MODELS_CACHE_TTL_MS = 5000;

  private consecutiveBurstFailures = 0;
  private regressionBurstThreshold = 3;
  private readonly modelHealthRepository?:
    | {
        advanceEpoch(
          name: string,
          reason: string,
          notes?: string,
        ): Promise<any>;
      }
    | undefined;
  private readonly onRegressionBurst?:
    | ((
        consecutiveFailures: number,
        lastTask: TaskRecord,
        reason: string,
      ) => Promise<void>)
    | undefined;

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
    readonly oomGuard?: import("../hardware/OomPredictiveGuard.js").OomPredictiveGuard;
    readonly ollamaProvider?: {
      unloadModel(model: string): Promise<void>;
      waitForModelEviction?(model: string, timeoutMs?: number): Promise<boolean>;
    };
    readonly defaultTimeoutMs?: number;
    readonly noProgressTimeoutMs?: number;
    readonly perModelTimeoutMs?: Readonly<Record<string, number>>;
    readonly autoReplenish?: boolean;
    readonly rehabilitationService?: TaskRehabilitationService;
    readonly vramPrefetchCoordinator?: VramPrefetchCoordinator;
    readonly maxRetries?: number;
    readonly modelHealthRepository?: {
      advanceEpoch(name: string, reason: string, notes?: string): Promise<any>;
    };
    readonly regressionBurstThreshold?: number;
    readonly onRegressionBurst?: (
      consecutiveFailures: number,
      lastTask: TaskRecord,
      reason: string,
    ) => Promise<void>;
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
    this.vramPrefetchCoordinator = options.vramPrefetchCoordinator;
    this.maxRetries = options.maxRetries ?? 3;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 480_000; // 8 minutes default
    this.noProgressTimeoutMs = options.noProgressTimeoutMs;
    this.modelHealthRepository = options.modelHealthRepository;
    this.regressionBurstThreshold = options.regressionBurstThreshold ?? 3;
    this.onRegressionBurst = options.onRegressionBurst;
    this.perModelTimeoutMs = options.perModelTimeoutMs ?? {
      "qwen2.5-coder:3b": 360_000,
      "gemma3:4b-it-qat": 420_000,
      "gemma3:12b-it-qat": 780_000,
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
   * Dynamically handles context suffixes (-4k, -8k, -16k, -32k) and standard model tag variations.
   */
  public static normalizeModelName(rawModel: string): string {
    const trimmed = rawModel.trim();
    const aliasMap: Record<string, string> = {
      "deepseek-r1:8b-4k": "deepseek-r1:8b",
      "gemma3:4b-it-qat-4k": "gemma3:4b-it-qat",
      "gemma3:4b": "gemma3:4b-it-qat",
      "gemma3:12b-it-qat-4k": "gemma3:12b-it-qat",
      "gemma3:12b": "gemma3:12b-it-qat",
      "qwen2.5-coder:3b-4k": "qwen2.5-coder:3b",
      "qwen2.5-coder:7b-4k": "qwen2.5-coder:7b-instruct-q4_K_M",
      "qwen2.5-coder:7b": "qwen2.5-coder:7b-instruct-q4_K_M",
      "qwen2.5-coder:14b-4k": "qwen2.5-coder:14b",
      "deepseek-coder-v2:16b-4k": "deepseek-coder-v2:16b",
      "phi-4": "phi4",
      "phi-4:14b": "phi4",
      "phi4:14b": "phi4",
    };

    if (aliasMap[trimmed]) {
      return aliasMap[trimmed];
    }

    const stripped = trimmed.replace(/-(?:4|8|16|32)k$/i, "");
    if (aliasMap[stripped]) {
      return aliasMap[stripped];
    }

    // Dynamic normalization: if model ends in -4k, -8k, -16k, -32k, return the base tag
    if (/-(?:4|8|16|32)k$/i.test(trimmed)) {
      return stripped;
    }

    return trimmed;
  }

  /**
   * Resolves maximum execution timeout in milliseconds for the given model.
   * Dynamically scales with parameter size if not explicitly configured in perModelTimeoutMs.
   */
  public resolveModelTimeout(model: string): number {
    const normalized = TaskScheduler.normalizeModelName(model);
    if (this.perModelTimeoutMs[normalized] !== undefined) {
      return this.perModelTimeoutMs[normalized]!;
    }
    if (this.perModelTimeoutMs[model] !== undefined) {
      return this.perModelTimeoutMs[model]!;
    }

    // Dynamic heuristic based on parameter size with length bounding and word boundaries to prevent ReDoS
    const safeModel = normalized.length > 80 ? normalized.slice(0, 80) : normalized;
    const paramMatch = /(?:^|[:\-_/\s])(\d+(?:\.\d+)?)\s*([bm])(?=[^a-z0-9]|$)/i.exec(safeModel);
    if (paramMatch && paramMatch[1] && paramMatch[2]) {
      const val = parseFloat(paramMatch[1]);
      const unit = paramMatch[2].toLowerCase();
      if (unit === "m") {
        return 240_000; // Small models: 4 mins
      }
      if (val <= 4) {
        return 420_000; // 3B-4B: 7 mins
      }
      if (val <= 8) {
        return 600_000; // 7B-8B: 10 mins
      }
      if (val <= 16) {
        return 840_000; // 12B-16B: 14 mins
      }
      return 1_200_000; // >16B: 20 mins
    }

    return this.defaultTimeoutMs;
  }

  /**
   * Returns the count of consecutive task failures in the current burst window.
   */
  public getConsecutiveBurstFailures(): number {
    return this.consecutiveBurstFailures;
  }

  /**
   * Sets the consecutive failure threshold that triggers regression burst mitigation.
   */
  public setRegressionBurstThreshold(threshold: number): void {
    this.regressionBurstThreshold = Math.max(1, threshold);
  }

  /**
   * Regrooms the task queue by reclaiming stale running tasks and refreshing pending tasks.
   */
  public async regroomQueue(): Promise<{
    reclaimedCount: number;
    groomedCount: number;
  }> {
    let reclaimedCount = 0;
    if (typeof this.taskRepo.reclaimStaleRunningTasks === "function") {
      try {
        reclaimedCount = await this.taskRepo.reclaimStaleRunningTasks(15);
      } catch (err) {
        this.logger.warn("Failed to reclaim stale tasks during queue grooming", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    let groomedCount = 0;
    try {
      const pendingTasks = await this.taskRepo.listPending();
      for (const t of pendingTasks) {
        if (this.groomer) {
          this.groomer.groom(t);
          groomedCount++;
        }
      }
    } catch (err) {
      this.logger.warn("Failed to re-groom pending tasks", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    this.logger.info("Completed queue regrooming", {
      reclaimedCount,
      groomedCount,
    });
    return { reclaimedCount, groomedCount };
  }

  /**
   * Handles regression bursts: regrooms the queue, advances telemetry epoch, and invokes callbacks.
   */
  public async handleRegressionBurst(
    lastTask: TaskRecord,
    reason: string,
  ): Promise<void> {
    const burstCount = this.consecutiveBurstFailures;
    this.logger.warn(
      `Regression burst detected: ${burstCount} consecutive failures encountered. Triggering queue regroom and telemetry epoch reset.`,
      {
        consecutiveFailures: burstCount,
        threshold: this.regressionBurstThreshold,
        taskId: lastTask.id,
        reason,
      },
    );

    // 1. Regroom queue to clean up stale states and reclaim stuck executions
    await this.regroomQueue();

    // 2. Advance / reset telemetry epoch if health repo is wired
    if (this.modelHealthRepository) {
      try {
        const epochName = `Epoch-${Date.now()}`;
        const epochReason = `Regression burst mitigation: ${burstCount} consecutive failures (last: ${lastTask.id})`;
        const notes = `Automated mitigation triggered for failure reason: ${reason}`;
        await this.modelHealthRepository.advanceEpoch(
          epochName,
          epochReason,
          notes,
        );
        this.logger.info(
          "Advanced telemetry epoch for regression burst mitigation",
          {
            epochName,
          },
        );
      } catch (epochErr) {
        this.logger.error(
          "Failed to advance epoch during regression burst mitigation",
          {
            error:
              epochErr instanceof Error ? epochErr.message : String(epochErr),
          },
        );
      }
    }

    // 3. Notify custom callback if registered
    if (this.onRegressionBurst) {
      try {
        await this.onRegressionBurst(burstCount, lastTask, reason);
      } catch (cbErr) {
        this.logger.error("Error in onRegressionBurst callback", {
          error: cbErr instanceof Error ? cbErr.message : String(cbErr),
        });
      }
    }

    // 4. Reset consecutive burst failure count after mitigation completes
    this.consecutiveBurstFailures = 0;
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
    this.isStopping = false;
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
   * Returns whether scheduling is currently paused.
   */
  public getPaused(): boolean {
    return this.isPaused;
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
    this.isStopping = true;
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {
        // ignore
      }
      this.activeAbortController = undefined;
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
   * Retrieves the ModelVramCatalog instance.
   */
  public getVramCatalog(): ModelVramCatalog {
    return this.vramCatalog;
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
   * Sets or updates the VRAM prefetch coordinator at runtime (T87.1.1).
   */
  public setVramPrefetchCoordinator(
    coordinator: VramPrefetchCoordinator,
  ): void {
    this.vramPrefetchCoordinator = coordinator;
  }

  /**
   * Retrieves the active VRAM prefetch coordinator, if configured.
   */
  public getVramPrefetchCoordinator(): VramPrefetchCoordinator | undefined {
    return this.vramPrefetchCoordinator;
  }

  /**
   * Retrieves the task currently active and executing in the scheduler cycle.
   */
  public getCurrentRunningTask(): TaskRecord | undefined {
    return this.currentRunningTask;
  }

  /**
   * Retrieves the model identifier currently running in the scheduler cycle.
   */
  public getCurrentRunningModel(): string | undefined {
    return this.currentRunningModel;
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
      this.logger.info(
        `Disparate architecture switch (${activeVramModel} -> ${targetModel}) with constrained VRAM. Triggering explicit unload.`,
        { activeVramModel, targetModel },
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
          this.logger.warn(
            `Explicit model unload for '${activeVramModel}' failed`,
            { error: err instanceof Error ? err.message : String(err) },
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
  /**
   * Evaluates whether a task can be safely dispatched given current host memory and VRAM headroom (T68.2.3, T68.6.2).
   *
   * @param task - Candidate task record.
   * @param modelName - Specific model identifier to evaluate.
   * @returns Detailed eligibility decision with explanation if dispatch is deferred.
   */
  public async evaluateDispatchEligibility(
    task: TaskRecord,
    modelName?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const model = modelName ?? task.modelAssigned ?? "qwen2.5-coder:7b";
    const requiredMb = this.vramCatalog.estimateTotalVramMb(model, 4096);

    // If predictive OOM guard detects severe host memory pressure, defer dispatch (T68.6.2)
    if (this.oomGuard) {
      const pressure = this.oomGuard.evaluateSystemMemoryPressure();
      if (pressure.isUnderPressure) {
        const availableMb = Math.round(
          pressure.memAvailableBytes / (1024 * 1024),
        );
        const thresholdMb = Math.round(
          pressure.thresholdBytes / (1024 * 1024),
        );
        return {
          allowed: false,
          reason: `host memory pressure (${availableMb} MB available < threshold ${thresholdMb} MB)`,
        };
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
        return { allowed: true };
      }
    }

    // If telemetry provider implements checkVramHeadroom, delegate directly (T68.2.1, T68.2.2)
    if (typeof this.telemetryProvider.checkVramHeadroom === "function") {
      const result = this.telemetryProvider.checkVramHeadroom(requiredMb);
      const allowed = typeof result === "boolean" ? result : await result;
      if (!allowed) {
        return {
          allowed: false,
          reason: `insufficient VRAM headroom for ${model} (${requiredMb} MB required)`,
        };
      }
      return { allowed: true };
    }

    // Fallback to getVramMetrics if supported
    if (typeof this.telemetryProvider.getVramMetrics === "function") {
      try {
        const metrics = await this.telemetryProvider.getVramMetrics();
        if (metrics.totalBytes > 512 * 1024 * 1024) {
          const freeMb = Math.floor(metrics.freeBytes / (1024 * 1024));
          if (freeMb < requiredMb) {
            return {
              allowed: false,
              reason: `insufficient VRAM headroom (${freeMb} MB free < ${requiredMb} MB required)`,
            };
          }
          return { allowed: true };
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
        if (freeMb < requiredMb) {
          return {
            allowed: false,
            reason: `insufficient VRAM headroom (${freeMb} MB free < ${requiredMb} MB required)`,
          };
        }
        return { allowed: true };
      }
    } catch {
      // Allow dispatch if sampling fails in non-hardware environment
      return { allowed: true };
    }

    return { allowed: true };
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
    const decision = await this.evaluateDispatchEligibility(task, modelName);
    return decision.allowed;
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

    // Discover dynamically installed models from host Ollama instance (/api/tags)
    let installedModels: readonly string[] = [];
    try {
      installedModels = await this.probe.getInstalledModels();
    } catch {
      installedModels = [];
    }

    // Configurable candidate pool from environment (comma-delimited), falling back to installed non-utility models
    const configuredCandidatesEnv = process.env["CANDIDATE_MODELS"];
    const configuredCandidates = configuredCandidatesEnv
      ? configuredCandidatesEnv
          .split(",")
          .map((m) => TaskScheduler.normalizeModelName(m.trim()))
          .filter((m) => m.length > 0)
      : [];

    const defaultImplementer =
      process.env["DEFAULT_IMPLEMENTER_MODEL"] || "deepseek-coder-v2:16b";
    const defaultReviewer =
      process.env["DEFAULT_REVIEWER_MODEL"] || "qwen2.5-coder:7b-instruct-q4_K_M";

    // Build the dynamic installed pool, excluding ultra-light utility models (e.g. smollm) for code generation
    const codingInstalledModels = installedModels.filter(
      (m) => !m.toLowerCase().includes("smollm") && m !== "qwen2.5-coder:3b",
    );

    const basePool =
      configuredCandidates.length > 0
        ? configuredCandidates
        : codingInstalledModels.length > 0
          ? codingInstalledModels
          : [
              defaultImplementer,
              defaultReviewer,
              ...this.vramCatalog
                .getAllProfiles()
                .map((p) => p.modelId)
                .filter((m) => m !== "qwen2.5-coder:3b"),
            ];

    let candidateList: string[];

    if (normalizedAssigned) {
      if (
        task.failureCount > 0 &&
        role !== "architect" &&
        role !== "reviewer"
      ) {
        // If the explicitly assigned model previously failed, allow fallback to installed candidates
        candidateList = Array.from(
          new Set([normalizedAssigned, ...basePool]),
        );
      } else {
        // Respect explicit model assignment for targeted tasks, boutiques, and unit test suites
        candidateList = [normalizedAssigned];
      }
    } else if (role === "architect" || role === "reviewer") {
      const reviewerEnv = process.env["REVIEWER_CANDIDATE_MODELS"];
      if (reviewerEnv) {
        candidateList = reviewerEnv
          .split(",")
          .map((m) => TaskScheduler.normalizeModelName(m.trim()))
          .filter((m) => m.length > 0);
      } else {
        candidateList = Array.from(
          new Set([defaultReviewer, defaultImplementer, ...basePool]),
        );
      }
    } else {
      candidateList = Array.from(basePool);
    }

    try {
      const sample = await this.telemetryProvider.sample();
      // Only throttle heavy models if hardware temperature reaches the Critical Red zone (>= 95C)
      if (
        sample.edgeTempCelsius >=
          (this.governor ? this.governor.redMax : 95) &&
        !normalizedAssigned
      ) {
        const smallerCandidates = candidateList.filter((m) => {
          const timeout = this.resolveModelTimeout(m);
          return timeout <= 600_000;
        });
        if (smallerCandidates.length > 0) {
          candidateList = smallerCandidates;
        }
      }
    } catch {
      // ignore
    }

    if (role !== "architect" && role !== "reviewer") {
      candidateList = candidateList.filter((m) => m !== "qwen2.5-coder:3b");
    }

    if (candidateList.length === 0) {
      candidateList = normalizedAssigned
        ? [normalizedAssigned]
        : [defaultImplementer];
    }

    return this.evictionManager.selectModel(
      task.role as AgentRole,
      candidateList,
      activeVramModel,
    );
  }

  /**
   * Predicts the next required model using queue heuristics and current task progression (T87.1.2).
   *
   * Heuristic logic:
   * 1. If an active task is finishing code generation / entering test verification and will require
   *    a frontier reviewer or architect review, returns the reviewer model candidate.
   * 2. Otherwise, examines the highest priority waiting task in the PENDING queue and resolves
   *    the candidate model that would be selected for it.
   * 3. Returns the predicted model tag string, or null if no tasks are waiting.
   *
   * @param currentTask - Optional reference to the task currently executing in the pipeline.
   * @returns Predicted model identifier or null if no task is queued.
   */
  public async predictNextModel(
    currentTask?: TaskRecord,
  ): Promise<string | null> {
    const loadedModels = await this.queryLoadedModels();
    const activeVramModel = loadedModels.length > 0 ? loadedModels[0]! : null;

    // 1. If currentTask is in progress and nearing completion, predict the subsequent reviewer model
    if (currentTask) {
      if (
        currentTask.role !== "reviewer" &&
        currentTask.role !== "architect"
      ) {
        try {
          const defaultReviewer =
            process.env["DEFAULT_REVIEWER_MODEL"] || "qwen2.5-coder:7b-instruct-q4_K_M";
          const defaultImplementer =
            process.env["DEFAULT_IMPLEMENTER_MODEL"] || "deepseek-coder-v2:16b";
          const reviewerCandidate = await this.evictionManager.selectModel(
            "reviewer" as AgentRole,
            [defaultReviewer, defaultImplementer],
            activeVramModel,
          );
          if (reviewerCandidate) {
            return reviewerCandidate;
          }
        } catch {
          // fallback to queue inspection
        }
      }
    }

    // 2. Queue heuristic: inspect top pending task in queue
    try {
      const allPending = await this.taskRepo.listPending();
      const waiting = allPending.filter(
        (t) =>
          t.status === "PENDING" &&
          (!currentTask || t.id !== currentTask.id) &&
          (!this.currentRunningTask || t.id !== this.currentRunningTask.id),
      );

      if (waiting.length === 0) {
        return null;
      }

      // Sort pending tasks by Model Affinity & Effective Priority
      let sorted = this.sorter.sort(waiting, activeVramModel);
      sorted = this.groomer.applyStarvationCap(sorted, activeVramModel, 5);
      const nextTask = sorted.length > 0 ? sorted[0]! : waiting[0]!;

      return await this.selectCandidateModel(nextTask, activeVramModel);
    } catch {
      return null;
    }
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
            // Subtasks (rehab tasks or decomposed units) are created to resolve failed work
            // and must only be considered complete if their own specific ID is in completedIds,
            // never by matching a parent task code prefix.
            const isSubtask = Boolean(t.parentTaskId) || t.title.startsWith("[Rehab");

            let isCompleted =
              completedIds.has(normId) ||
              completedIds.has(shortId);

            if (!isCompleted && !isSubtask) {
              const codeMatch = t.title.match(/^(T\d+\.\d+\.\d+):/i);
              const taskCode = codeMatch ? codeMatch[1]!.toLowerCase() : null;
              if (taskCode && completedIds.has(taskCode)) {
                isCompleted = true;
              }
            }

            if (isCompleted) {
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
              this.logger.info(
                `Automatically requeued ${requeuedCount} failed tasks for retry`,
                { requeuedCount },
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
              this.logger.info(
                `Automatically seeded ${seededCount} uncompleted tasks from taskcade.md`,
                { seededCount },
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

      // Evaluate tasks in affinity order, verifying VRAM headroom and system pressure per candidate (T68.2.3, T68.6.2)
      for (const candidateTask of sorted) {
        const candidateModel = await this.selectCandidateModel(
          candidateTask,
          activeVramModel,
        );
        const eligibility = await this.evaluateDispatchEligibility(
          candidateTask,
          candidateModel,
        );
        if (eligibility.allowed) {
          targetTask = candidateTask;
          selectedModel = candidateModel;
          break;
        } else {
          this.logger.warn(
            `Deferring candidate task ${candidateTask.id} (${candidateModel}): ${eligibility.reason ?? "insufficient resources"}`,
            {
              taskId: candidateTask.id,
              candidateModel,
              reason: eligibility.reason,
            },
          );
        }
      }

      if (!targetTask || !selectedModel) {
        // If all candidate tasks were deferred due to VRAM constraints while a disparate model
        // is resident in VRAM, proactively evict the resident model if the top candidate fits standalone (T68.4.2)
        if (
          activeVramModel &&
          activeVramModel !== "None" &&
          this.ollamaProvider &&
          sorted.length > 0
        ) {
          const topCandidate = sorted[0]!;
          const candidateModel = await this.selectCandidateModel(
            topCandidate,
            activeVramModel,
          );

          if (candidateModel !== activeVramModel) {
            let totalVramMb = 0;
            if (typeof this.telemetryProvider.getVramMetrics === "function") {
              try {
                const metrics = await this.telemetryProvider.getVramMetrics();
                totalVramMb = Math.floor(metrics.totalBytes / (1024 * 1024));
              } catch {}
            }
            if (totalVramMb === 0) {
              try {
                const sample = await this.telemetryProvider.sample();
                totalVramMb = Math.floor(sample.vramTotalBytes / (1024 * 1024));
              } catch {}
            }

            const requiredMb = this.vramCatalog.estimateTotalVramMb(
              candidateModel,
              4096,
            );
            const safetyMarginMb = 1024;

            if (totalVramMb >= requiredMb + safetyMarginMb) {
              this.logger.info(
                `All candidate tasks deferred due to co-residency VRAM constraint with loaded model '${activeVramModel}'. Proactively unloading to accommodate '${candidateModel}' (${requiredMb} MB required, ${totalVramMb} MB total VRAM).`,
                {
                  activeVramModel,
                  candidateModel,
                  requiredMb,
                  totalVramMb,
                },
              );

              await this.prepareModelExecution(candidateModel, activeVramModel);
              this.cachedLoadedModels = null;

              const recheck = await this.evaluateDispatchEligibility(
                topCandidate,
                candidateModel,
              );
              if (recheck.allowed) {
                targetTask = topCandidate;
                selectedModel = candidateModel;
              }
            }
          }
        }

        if (!targetTask || !selectedModel) {
          return null;
        }
      }

      // 3b. Pre-dispatch safeguard: ensure targetTask was not completed in taskcade.md or history
      if (this.seedLoader) {
        try {
          const completedIds = await this.seedLoader.getCompletedTaskIds();
          const normalizedId = targetTask.id.toLowerCase();
          const shortId = normalizedId.replace("taskcade-", "");
          const isSubtask =
            Boolean(targetTask.parentTaskId) ||
            targetTask.title.startsWith("[Rehab");

          let isCompleted =
            completedIds.has(normalizedId) || completedIds.has(shortId);

          if (!isCompleted && !isSubtask) {
            const taskCodeMatch = targetTask.title.match(/^(T\d+\.\d+\.\d+):/i);
            const taskCode = taskCodeMatch
              ? taskCodeMatch[1]!.toLowerCase()
              : null;
            if (taskCode && completedIds.has(taskCode)) {
              isCompleted = true;
            }
          }

          if (isCompleted) {
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
        this.logger.warn(`Preflight rejected task ${targetTask.id}: ${message}`, {
          taskId: targetTask.id,
          message,
        });
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
          this.logger.info(
            `Offloading compute-intensive task ${targetTask.id} (${selectedModel}) to remote fleet node '${this.lastPlacementDecision.nodeId}'`,
            {
              taskId: targetTask.id,
              selectedModel,
              nodeId: this.lastPlacementDecision.nodeId,
              targetHost: this.lastPlacementDecision.targetHost,
              targetPort: this.lastPlacementDecision.targetPort,
              reason: this.lastPlacementDecision.reason,
            },
          );
        } else {
          this.logger.info(
            `Retaining task ${targetTask.id} (${selectedModel}) locally on orchestrator node: ${this.lastPlacementDecision.reason}`,
            {
              taskId: targetTask.id,
              selectedModel,
              reason: this.lastPlacementDecision.reason,
            },
          );
        }
      }

      // 6. Check & Apply Thermal Governor Pacing
      const thermalEval = await this.governor.enforcePacing(
        this.telemetryProvider,
      );
      if (thermalEval.emergencyHalt) {
        this.logger.error(
          `Thermal cutoff (${thermalEval.tempCelsius}C >= ${this.governor.emergencyShutdownTemp}C). Halting task queue immediately.`,
          {
            tempCelsius: thermalEval.tempCelsius,
            threshold: this.governor.emergencyShutdownTemp,
          },
        );
        this.isPaused = true;
        return null;
      }

      // 6b. Explicit model unload on disparate architecture shift under constrained VRAM (T68.4.2)
      await this.prepareModelExecution(selectedModel, activeVramModel);

      // 7. Transition task state to RUNNING
      this.logger.info(
        `Dispatching task ${targetTask.id} ('${targetTask.title}') to model '${selectedModel}'`,
        {
          taskId: targetTask.id,
          title: targetTask.title,
          selectedModel,
        },
      );
      await this.taskRepo.updateStatus(targetTask.id, "RUNNING");
      await this.taskRepo.updateModel(targetTask.id, selectedModel);
      this.currentRunningTask = targetTask;
      this.currentRunningModel = selectedModel;
      this.vramPrefetchCoordinator?.recordScheduledModel(selectedModel);


      // 8. Dispatch Execution Handler with Per-Model Watchdog Timer
      if (this.executionHandler) {
        const stageStartMs = Date.now();
        const stageId = await this.stageRepo.recordStageStart(
          targetTask.id,
          "generation",
        );
        const modelTimeoutMs = this.resolveModelTimeout(selectedModel);

        const abortController = new AbortController();
        this.activeAbortController = abortController;
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
            this.consecutiveBurstFailures = 0;
            this.logger.info(
              `Task ${targetTask.id} finished with status COMPLETED in ${durationMs}ms at ${actualTps.toFixed(1)} tok/s`,
              {
                taskId: targetTask.id,
                durationMs,
                tokensPerSec: actualTps,
                status: "COMPLETED",
              },
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
            this.consecutiveBurstFailures++;
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
              this.logger.info(
                `Task ${targetTask.id} attempt ${effectiveFailureCount}/${this.maxRetries} failed. Requeuing for autonomous remediation.`,
                {
                  taskId: targetTask.id,
                  attempt: effectiveFailureCount,
                  maxRetries: this.maxRetries,
                  failureReason,
                },
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
              this.logger.info(
                `Task ${targetTask.id} reached max retries (${effectiveFailureCount}/${this.maxRetries}). Marking FAILED and triggering rehabilitation.`,
                {
                  taskId: targetTask.id,
                  effectiveFailureCount,
                  maxRetries: this.maxRetries,
                },
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
                  this.logger.error(
                    `Rehabilitation failed for task ${targetTask.id}`,
                    {
                      taskId: targetTask.id,
                      error:
                        rehabErr instanceof Error
                          ? rehabErr.message
                          : String(rehabErr),
                    },
                  );
                }
              }
            }

            if (this.consecutiveBurstFailures >= this.regressionBurstThreshold) {
              await this.handleRegressionBurst(targetTask, failureReason);
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
          if (this.isStopping) {
            return targetTask;
          }
          const durationMs = Date.now() - stageStartMs;
          const errorMsg = err instanceof Error ? err.message : String(err);
          const classification = FailureClassifier.classify(
            err instanceof Error ? err : errorMsg,
          );
          const isTimeout =
            classification.category === "TIMEOUT" ||
            err instanceof ExecutionTimeoutError;

          this.logger.error(
            `Task ${targetTask.id} threw error [${classification.category}] after ${durationMs}ms`,
            {
              taskId: targetTask.id,
              category: classification.category,
              durationMs,
              error: err instanceof Error ? err.message : String(err),
            },
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
            this.logger.info(
              `Task ${targetTask.id} caught error attempt ${effectiveFailureCount}/${this.maxRetries}. Requeuing for autonomous retry.`,
              {
                taskId: targetTask.id,
                attempt: effectiveFailureCount,
                maxRetries: this.maxRetries,
                failureReason,
              },
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
            this.logger.info(
              `Task ${targetTask.id} reached max retries on error (${effectiveFailureCount}/${this.maxRetries}). Marking FAILED and triggering rehabilitation.`,
              {
                taskId: targetTask.id,
                effectiveFailureCount,
                maxRetries: this.maxRetries,
              },
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
                this.logger.error(
                  `Rehabilitation failed for task ${targetTask.id}`,
                  {
                    taskId: targetTask.id,
                    error:
                      rehabErr instanceof Error
                        ? rehabErr.message
                        : String(rehabErr),
                  },
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

          this.consecutiveBurstFailures++;
          if (this.consecutiveBurstFailures >= this.regressionBurstThreshold) {
            await this.handleRegressionBurst(targetTask, failureReason);
          }
        }
      }

      return targetTask;
    } finally {
      this.currentRunningTask = undefined;
      this.currentRunningModel = undefined;
      this.activeAbortController = undefined;
      releaseLock();
    }

  }
}
