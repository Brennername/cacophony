import type { OllamaProvider } from "./OllamaProvider.js";
import type { TaskRecord, StageName } from "@cacophony/shared-types";

/**
 * Interface representing hardware telemetry for checking VRAM availability.
 */
export interface IHardwareVramChecker {
  getAvailableVramBytes(): Promise<number>;
}

/**
 * Interface representing a task scheduler capable of predicting the next model.
 */
export interface IModelPredictor {
  predictNextModel(currentTask?: TaskRecord): Promise<string | null>;
}

/**
 * Telemetry and hit/miss analytics for speculative VRAM prefetching.
 */
export interface VramPrefetchTelemetry {
  readonly prefetchesInitiated: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRatio: number;
  readonly lastPrefetchedModel: string | null;
  readonly isPrefetchInProgress: boolean;
}

/**
 * Configuration options for VramPrefetchCoordinator.
 */
export interface VramPrefetchCoordinatorOptions {
  /**
   * Reference to Ollama provider for residency check and model pre-warming.
   */
  readonly ollamaProvider: OllamaProvider;

  /**
   * Predictor interface to anticipate the next model required by the queue.
   */
  readonly modelPredictor?: IModelPredictor | undefined;

  /**
   * Optional hardware telemetry provider to verify VRAM headroom before prefetching.
   */
  readonly vramChecker?: IHardwareVramChecker | undefined;

  /**
   * Minimum free VRAM headroom required to trigger speculative prefetch (default: 4 GB).
   */
  readonly minVramHeadroomBytes?: number | undefined;

  /**
   * Default keep_alive duration for preloaded models in Ollama (default: "10m").
   */
  readonly defaultKeepAlive?: string | number | undefined;

  /**
   * Whether speculative prefetching is enabled (default: true).
   */
  readonly enabled?: boolean | undefined;
}

/**
 * VramPrefetchCoordinator
 *
 * Implements speculative model pre-warming into GPU VRAM (T87.1.1).
 * When an active autonomous task reaches its compilation or scoped test verification
 * stage (`test_execution`), the GPU is idle while CPU-bound processes execute.
 *
 * This coordinator queries the queue heuristic predictor to determine the next
 * required model (e.g. a frontier reviewer or the next queued implementation model),
 * checks VRAM safety headroom, and triggers background non-blocking pre-warming via
 * Ollama POST /api/generate.
 */
export class VramPrefetchCoordinator {
  private readonly ollamaProvider: OllamaProvider;
  private readonly modelPredictor: IModelPredictor | undefined;
  private readonly vramChecker: IHardwareVramChecker | undefined;
  private readonly minVramHeadroomBytes: number;
  private readonly defaultKeepAlive: string | number;
  private readonly enabled: boolean;

  private activePrefetchPromise: Promise<void> | null = null;
  private activePrefetchModel: string | null = null;
  private lastPrefetchedModel: string | null = null;
  private prefetchesInitiatedCount = 0;
  private hitsCount = 0;
  private missesCount = 0;

  constructor(options: VramPrefetchCoordinatorOptions) {
    this.ollamaProvider = options.ollamaProvider;
    this.modelPredictor = options.modelPredictor;
    this.vramChecker = options.vramChecker;
    this.minVramHeadroomBytes =
      options.minVramHeadroomBytes ?? 4 * 1024 * 1024 * 1024; // 4 GB default
    this.defaultKeepAlive = options.defaultKeepAlive ?? "10m";
    this.enabled = options.enabled ?? true;
  }

  /**
   * Evaluates and triggers speculative prefetching for a task transitioning stages.
   * Typically invoked during the 'test_execution' or compilation phase.
   *
   * @param currentTask - The active task currently executing.
   * @param stage - The active pipeline stage name.
   * @returns Predicted model tag if prefetch was initiated or already resident, null otherwise.
   */
  public async prefetchForTask(
    currentTask: TaskRecord,
    stage: StageName,
  ): Promise<string | null> {
    if (!this.enabled || !this.modelPredictor) {
      return null;
    }

    // Speculative prefetching is targeted at stages where code generation has completed
    // and the GPU is idle during CPU-bound compilation / scoped test runs.
    if (stage !== "test_execution" && stage !== "deterministic_scrub") {
      return null;
    }

    try {
      const candidateModel =
        await this.modelPredictor.predictNextModel(currentTask);
      if (!candidateModel) {
        return null;
      }

      // Check if candidate is already in memory to avoid duplicate loads
      const isResident =
        await this.ollamaProvider.isModelResident(candidateModel);
      if (isResident) {
        this.lastPrefetchedModel = candidateModel;
        return candidateModel;
      }

      // Verify VRAM headroom if a hardware telemetry checker is configured
      if (this.vramChecker) {
        const availableBytes = await this.vramChecker.getAvailableVramBytes();
        if (availableBytes < this.minVramHeadroomBytes) {
          return null;
        }
      }

      // Trigger asynchronous non-blocking prefetch
      this.triggerBackgroundPreload(candidateModel);
      return candidateModel;
    } catch {
      // Prefetching is speculative and must never crash active task execution
      return null;
    }
  }

  /**
   * Programmatically pre-loads a model into VRAM on demand (e.g. from POST /api/models/preload).
   *
   * @param modelName - Tag of the model to warm up in VRAM.
   * @param keepAlive - Optional keep_alive duration override.
   * @returns Promise resolving to true if preload was dispatched, false otherwise.
   */
  public async preloadModel(
    modelName: string,
    keepAlive?: string | number,
  ): Promise<boolean> {
    if (!modelName || typeof modelName !== "string") {
      throw new Error("Model name must be a non-empty string");
    }

    try {
      const isResident = await this.ollamaProvider.isModelResident(modelName);
      if (isResident) {
        this.lastPrefetchedModel = modelName;
        return true;
      }

      await this.ollamaProvider.preloadModel(
        modelName,
        keepAlive ?? this.defaultKeepAlive,
      );
      this.prefetchesInitiatedCount++;
      this.lastPrefetchedModel = modelName;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Preload failed for model '${modelName}': ${message}`);
    }
  }

  /**
   * Records which model was actually scheduled next, updating hit/miss analytics.
   *
   * @param scheduledModel - Name of the model assigned to run the next task.
   */
  public recordScheduledModel(scheduledModel: string): void {
    if (!this.lastPrefetchedModel) {
      return;
    }

    if (
      this.lastPrefetchedModel === scheduledModel ||
      this.lastPrefetchedModel.startsWith(scheduledModel) ||
      scheduledModel.startsWith(this.lastPrefetchedModel)
    ) {
      this.hitsCount++;
    } else {
      this.missesCount++;
    }
  }

  /**
   * Returns current telemetry metrics for VRAM prefetch operations.
   */
  public getTelemetry(): VramPrefetchTelemetry {
    const totalPredictions = this.hitsCount + this.missesCount;
    const hitRatio =
      totalPredictions > 0
        ? Math.round((this.hitsCount / totalPredictions) * 100) / 100
        : 1.0;

    return {
      prefetchesInitiated: this.prefetchesInitiatedCount,
      hits: this.hitsCount,
      misses: this.missesCount,
      hitRatio,
      lastPrefetchedModel: this.lastPrefetchedModel,
      isPrefetchInProgress: this.activePrefetchPromise !== null,
    };
  }

  /**
   * Initiates a background preload promise without blocking the caller.
   */
  private triggerBackgroundPreload(modelName: string): void {
    if (this.activePrefetchPromise) {
      // Don't queue overlapping preloads if one is currently in flight for the same model
      if (this.activePrefetchModel === modelName) {
        return;
      }
    }

    this.prefetchesInitiatedCount++;
    this.activePrefetchModel = modelName;
    this.lastPrefetchedModel = modelName;

    this.activePrefetchPromise = this.ollamaProvider
      .preloadModel(modelName, this.defaultKeepAlive)
      .then(() => {
        // Successful preload complete
      })
      .catch(() => {
        // Handled silently; speculative prefetch failures do not break pipeline
      })
      .finally(() => {
        this.activePrefetchPromise = null;
        this.activePrefetchModel = null;
      });
  }
}

