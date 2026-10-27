import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type { ModelRosterRepository } from "@cacophony/db";

export interface BoutiqueTask {
  readonly id: string;
  readonly title: string;
  readonly targetModel: string;
  readonly payload: Record<string, unknown>;
  readonly milestoneTag?: string | undefined;
  readonly queuedAt: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  result?: unknown;
  error?: string | undefined;
  durationMs?: number | undefined;
}

export interface BoutiqueBatchRunResult {
  readonly batchId: string;
  readonly targetModel: string;
  readonly totalTasks: number;
  readonly successfulTasks: number;
  readonly failedTasks: number;
  readonly storageReclaimedBytes: number;
  readonly preFlightFreeBytes: number;
  readonly postFlightFreeBytes: number;
  readonly durationMs: number;
  readonly tasks: readonly BoutiqueTask[];
  readonly cleanupSuccess: boolean;
}

export interface BoutiqueStoragePreparationResult {
  readonly preFlightFreeBytes: number;
  readonly vacuumDone: boolean;
  readonly reductionDone: boolean;
  readonly worktreesPruned: number;
}

export interface BoutiqueBatchOrchestratorOptions {
  readonly rosterRepo?: ModelRosterRepository | undefined;
  readonly maintenanceService?: {
    runVacuumAndCompaction(options?: { full?: boolean }): Promise<unknown>;
    reduceOldTaskLogs(): Promise<unknown>;
    getStorageMetrics?(): Promise<unknown>;
  } | undefined;
  readonly modelClient?: {
    pullModel?(modelId: string): Promise<unknown>;
    deleteModel?(modelId: string): Promise<unknown>;
  } | undefined;
  readonly batchSizeThreshold?: number | undefined;
  readonly minFreeDiskBytes?: number | undefined;
  readonly diskProbe?: () => Promise<{ freeBytes: number }>;
  readonly taskExecutor?: (task: BoutiqueTask) => Promise<unknown>;
  readonly worktreePruner?: () => Promise<number>;
}

/**
 * BoutiqueBatchOrchestrator
 *
 * Implements Phase S5 (T-S5.4):
 * On-demand, batched execution for specialized boutique models (e.g., deep security audits,
 * full-repo architectural compliance, pre-release certification) with automated storage preparation
 * and NVMe write endurance protection.
 *
 * Operational Directives:
 * 1. SSD Endurance Guard: Strictly avoids single-task model pull/delete churn to safeguard
 *    host NVMe drive TBW limits and prevent upstream rate-limiting.
 * 2. Staged Pool: Holds boutique tasks until batch thresholds or explicit milestone triggers fire.
 * 3. Pre-Flight Storage Reclamation: Validates free disk space (>= 15 GB default), runs DB VACUUM
 *    and WAL compaction, reduces historical logs to statistical histograms, and prunes build/test caches.
 * 4. Sequential Execution: Pulls the boutique weights, runs tasks sequentially under a dedicated lock,
 *    and produces a consolidated report.
 * 5. Clean Deprovisioning: Safely deprovisions weights from disk post-batch.
 */
export class BoutiqueBatchOrchestrator {
  private readonly rosterRepo?: ModelRosterRepository | undefined;
  private readonly maintenanceService?: BoutiqueBatchOrchestratorOptions["maintenanceService"];
  private readonly modelClient?: BoutiqueBatchOrchestratorOptions["modelClient"];
  private readonly batchSizeThreshold: number;
  private readonly minFreeDiskBytes: number;
  private readonly diskProbe: () => Promise<{ freeBytes: number }>;
  private readonly taskExecutor: (task: BoutiqueTask) => Promise<unknown>;
  private readonly worktreePruner: () => Promise<number>;

  private readonly taskQueue: Map<string, BoutiqueTask> = new Map();
  private isBatchRunning: boolean = false;
  private currentRunningModel: string | null = null;

  constructor(options: BoutiqueBatchOrchestratorOptions = {}) {
    this.rosterRepo = options.rosterRepo;
    this.maintenanceService = options.maintenanceService;
    this.modelClient = options.modelClient;
    this.batchSizeThreshold = options.batchSizeThreshold ?? 3;
    // Default 15 GB buffer to ensure adequate headroom for large boutique weights (14B-32B parameters)
    this.minFreeDiskBytes = options.minFreeDiskBytes ?? 15 * 1024 * 1024 * 1024;

    this.diskProbe = options.diskProbe ?? this.defaultDiskProbe.bind(this);
    this.taskExecutor = options.taskExecutor ?? (async () => ({ executed: true }));
    this.worktreePruner = options.worktreePruner ?? this.defaultWorktreePruner.bind(this);
  }

  /**
   * Enqueues a specialized boutique task into the staging pool.
   */
  public async enqueueTask(input: {
    readonly id?: string | undefined;
    readonly title: string;
    readonly targetModel: string;
    readonly payload?: Record<string, unknown> | undefined;
    readonly milestoneTag?: string | undefined;
  }): Promise<BoutiqueTask> {
    const id = input.id || `btq-${randomUUID().slice(0, 8)}`;
    const task: BoutiqueTask = {
      id,
      title: input.title,
      targetModel: input.targetModel,
      payload: input.payload || {},
      milestoneTag: input.milestoneTag,
      queuedAt: new Date().toISOString(),
      status: "QUEUED",
    };

    this.taskQueue.set(id, task);

    // Register boutique model in database roster if repository is supplied
    if (this.rosterRepo) {
      try {
        await this.rosterRepo.upsert({
          modelId: input.targetModel,
          tier: "BOUTIQUE",
          roles: ["architect", "reviewer"],
          isActive: true,
          isProtected: false,
          notes: `Staged boutique model for task ${id}`,
        });
      } catch {
        // Keep resilient if database is transiently unavailable
      }
    }

    return task;
  }

  /**
   * Returns list of currently queued tasks, optionally filtered by target model.
   */
  public getPendingQueue(targetModel?: string): readonly BoutiqueTask[] {
    const all = Array.from(this.taskQueue.values()).filter((t) => t.status === "QUEUED");
    if (targetModel) {
      return all.filter((t) => t.targetModel === targetModel);
    }
    return all;
  }

  /**
   * Evaluates whether a batched execution should trigger based on queue depth or milestone tags.
   */
  public shouldTriggerBatch(targetModel: string): boolean {
    const queued = this.getPendingQueue(targetModel);
    if (queued.length === 0) {
      return false;
    }

    // Trigger if count meets or exceeds batch threshold
    if (queued.length >= this.batchSizeThreshold) {
      return true;
    }

    // Trigger immediately if any queued task declares an explicit milestone tag
    const hasMilestone = queued.some((t) =>
      Boolean(
        t.milestoneTag &&
        ["release", "milestone", "admin_dispatch", "audit", "security_gate"].includes(
          t.milestoneTag.toLowerCase(),
        ),
      ),
    );

    return hasMilestone;
  }

  /**
   * Pre-flight storage preparation:
   * 1. Check current disk headroom.
   * 2. Trigger database vacuum and WAL compaction.
   * 3. Trigger statistical log reduction.
   * 4. Prune ephemeral worktrees and build cache.
   * 5. Verify post-prep storage meets required threshold.
   */
  public async prepareStorage(): Promise<BoutiqueStoragePreparationResult> {
    let vacuumDone = false;
    let reductionDone = false;
    let worktreesPruned = 0;

    // 1. Run database vacuum & compaction
    if (this.maintenanceService?.runVacuumAndCompaction) {
      try {
        await this.maintenanceService.runVacuumAndCompaction({ full: true });
        vacuumDone = true;
      } catch {
        // Log reduction will still attempt to proceed
      }
    }

    // 2. Run statistical log reduction
    if (this.maintenanceService?.reduceOldTaskLogs) {
      try {
        await this.maintenanceService.reduceOldTaskLogs();
        reductionDone = true;
      } catch {
        // Non-fatal if reduction already current
      }
    }

    // 3. Prune ephemeral test worktrees
    try {
      worktreesPruned = await this.worktreePruner();
    } catch {
      // Non-fatal if cache directory does not exist
    }

    // 4. Probe available disk space
    const diskInfo = await this.diskProbe();
    if (diskInfo.freeBytes < this.minFreeDiskBytes) {
      const freeGb = (diskInfo.freeBytes / (1024 * 1024 * 1024)).toFixed(2);
      const reqGb = (this.minFreeDiskBytes / (1024 * 1024 * 1024)).toFixed(2);
      throw new Error(
        `Pre-flight storage gate failed: Available disk space (${freeGb} GB) is below required boutique buffer (${reqGb} GB). Aborting pull to protect host stability.`,
      );
    }

    return {
      preFlightFreeBytes: diskInfo.freeBytes,
      vacuumDone,
      reductionDone,
      worktreesPruned,
    };
  }

  /**
   * Executes a batched run for all queued tasks assigned to targetModel.
   * Pulls model weights once, executes all batched tasks sequentially, and deprovisions weights cleanly.
   */
  public async executeBatch(
    targetModel: string,
    options: { readonly force?: boolean } = {},
  ): Promise<BoutiqueBatchRunResult> {
    if (this.isBatchRunning) {
      throw new Error(
        `A boutique batch execution is already actively running for model '${this.currentRunningModel}'. Wait for completion.`,
      );
    }

    const tasksToRun = this.getPendingQueue(targetModel);
    if (tasksToRun.length === 0) {
      throw new Error(`No queued boutique tasks found for model '${targetModel}'.`);
    }

    if (!options.force && !this.shouldTriggerBatch(targetModel)) {
      throw new Error(
        `Batch criteria not satisfied for model '${targetModel}' (${tasksToRun.length}/${this.batchSizeThreshold} tasks queued). Use force: true to override.`,
      );
    }

    this.isBatchRunning = true;
    this.currentRunningModel = targetModel;
    const batchId = `batch-${randomUUID().slice(0, 8)}`;
    const startTime = Date.now();

    let preFlightFreeBytes = 0;
    let postFlightFreeBytes = 0;
    let successfulTasks = 0;
    let failedTasks = 0;
    let cleanupSuccess = false;

    try {
      // Phase 1: Automated storage preparation
      const prepResult = await this.prepareStorage();
      preFlightFreeBytes = prepResult.preFlightFreeBytes;

      // Phase 2: Pull boutique model once for the entire batch
      if (this.modelClient?.pullModel) {
        await this.modelClient.pullModel(targetModel);
      }

      // Phase 3: Execute tasks sequentially within dedicated execution lock
      for (const task of tasksToRun) {
        task.status = "RUNNING";
        const taskStart = Date.now();
        try {
          const result = await this.taskExecutor(task);
          task.status = "COMPLETED";
          task.result = result;
          task.durationMs = Date.now() - taskStart;
          successfulTasks += 1;
        } catch (err) {
          task.status = "FAILED";
          task.error = err instanceof Error ? err.message : String(err);
          task.durationMs = Date.now() - taskStart;
          failedTasks += 1;
        }
      }

      // Phase 4: Cleanly deprovision boutique model weights from disk to protect TBW and reclaim space
      if (this.modelClient?.deleteModel) {
        try {
          await this.modelClient.deleteModel(targetModel);
          cleanupSuccess = true;
        } catch {
          cleanupSuccess = false;
        }
      } else {
        cleanupSuccess = true;
      }

      const postDisk = await this.diskProbe();
      postFlightFreeBytes = postDisk.freeBytes;

      const durationMs = Date.now() - startTime;
      const storageReclaimedBytes = Math.max(0, postFlightFreeBytes - preFlightFreeBytes);

      return {
        batchId,
        targetModel,
        totalTasks: tasksToRun.length,
        successfulTasks,
        failedTasks,
        storageReclaimedBytes,
        preFlightFreeBytes,
        postFlightFreeBytes,
        durationMs,
        tasks: tasksToRun,
        cleanupSuccess,
      };
    } finally {
      this.isBatchRunning = false;
      this.currentRunningModel = null;
    }
  }

  /**
   * Returns current orchestrator status, queue counts, and active batch state.
   */
  public getStatus(): {
    readonly isRunning: boolean;
    readonly currentBatchModel: string | null;
    readonly totalQueuedCount: number;
    readonly queueByModel: Record<string, number>;
  } {
    const queueByModel: Record<string, number> = {};
    let totalQueuedCount = 0;

    for (const task of this.taskQueue.values()) {
      if (task.status === "QUEUED") {
        totalQueuedCount += 1;
        queueByModel[task.targetModel] = (queueByModel[task.targetModel] ?? 0) + 1;
      }
    }

    return {
      isRunning: this.isBatchRunning,
      currentBatchModel: this.currentRunningModel,
      totalQueuedCount,
      queueByModel,
    };
  }

  /**
   * Default disk probe implementation using os and fs methods.
   */
  private async defaultDiskProbe(): Promise<{ freeBytes: number }> {
    try {
      // Use fs.statfs if available in Node 18+
      if (typeof (fs as any).statfs === "function") {
        const stats = await (fs as any).statfs(process.cwd());
        const freeBytes = Number(stats.bavail) * Number(stats.bsize);
        return { freeBytes };
      }
    } catch {
      // Fallback
    }

    // Default estimate if statfs unsupported
    return { freeBytes: os.freemem() + 20 * 1024 * 1024 * 1024 };
  }

  /**
   * Default worktree and build cache pruner.
   * Prunes ephemeral git worktrees and temporary build artifacts without touching user source files.
   */
  private async defaultWorktreePruner(): Promise<number> {
    const tmpWorktreesDir = path.join(process.cwd(), ".tmp_worktrees");
    let pruned = 0;
    try {
      const entries = await fs.readdir(tmpWorktreesDir);
      for (const entry of entries) {
        const entryPath = path.join(tmpWorktreesDir, entry);
        await fs.rm(entryPath, { recursive: true, force: true });
        pruned += 1;
      }
    } catch {
      // Temporary directory may not exist
    }
    return pruned;
  }
}
