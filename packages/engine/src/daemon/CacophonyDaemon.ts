import {
  type IDatabaseDriver,
  DatabaseDriverFactory,
  DatabaseMaintenanceService,
  MigrationRunner,
  TaskRepository,
  StageRepository,
  ModelHealthRepository,
  TelemetryRepository,
  StackProfileRepository,
  ModelRegistryRepository,
  UserSessionRepository,
  ModelProfileRepository
} from "@cacophony/db";
import type { TaskRecord, EnqueueTaskDto } from "@cacophony/shared-types";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";
import { QueueGroomer } from "../scheduler/QueueGroomer.js";
import { ModelEvictionManager } from "../scheduler/ModelEvictionManager.js";
import { AmdVegaTelemetryProvider } from "../telemetry/AmdVegaTelemetryProvider.js";
import { FallbackTelemetryProvider } from "../telemetry/FallbackTelemetryProvider.js";
import { TelemetryPoller } from "../telemetry/TelemetryPoller.js";
import { ThermalGovernor } from "../telemetry/ThermalGovernor.js";
import { StreamTapManager } from "../inference/StreamTapManager.js";
import { CodeScrubber } from "../scrubber/CodeScrubber.js";
import { DaemonIPCServer } from "./DaemonIPC.js";
import { CacophonyHttpServer } from "./CacophonyHttpServer.js";
import * as path from "node:path";



export interface DaemonConfig {
  readonly dbPath?: string;
  readonly socketPath?: string;
  readonly pollIntervalMs?: number;
  readonly httpPort?: number;
  readonly httpHost?: string;
  readonly frontendDistPath?: string;
  /** Custom domain for CORS origin allowlist (e.g. "cacophony.local") */
  readonly customDomain?: string;
}

/**
 * CacophonyDaemon
 *
 * Master background service uniting database persistence, APU sensor telemetry,
 * single-concurrency scheduler, stream tap auditing, and IPC command socket.
 */
export class CacophonyDaemon {
  private readonly config: DaemonConfig;
  private readonly driver: IDatabaseDriver;
  private readonly maintenanceService: DatabaseMaintenanceService;
  private readonly streamTapManager: StreamTapManager;
  private readonly codeScrubber: CodeScrubber;
  private taskRepo!: TaskRepository;
  private stageRepo!: StageRepository;
  private healthRepo!: ModelHealthRepository;
  private telemetryRepo!: TelemetryRepository;
  private stackProfileRepo!: StackProfileRepository;
  private userSessionRepo!: UserSessionRepository;
  private modelProfileRepo!: ModelProfileRepository;
  private telemetryPoller!: TelemetryPoller;
  private scheduler!: TaskScheduler;
  private ipcServer!: DaemonIPCServer;
  private httpServer?: CacophonyHttpServer | undefined;
  private fallbackRouter?: import("../inference/FrontierFallbackRouter.js").FrontierFallbackRouter | undefined;
  private modelManager?: import("../inference/OllamaModelManager.js").OllamaModelManager | undefined;
  private tenancyGuard?: import("../scheduler/ModelTenancyGuard.js").ModelTenancyGuard | undefined;
  private benchmarkRunner?: import("../scheduler/ModelBenchmarkRunner.js").ModelBenchmarkRunner | undefined;
  private distillationService?: import("../inference/ReasoningDistillationService.js").ReasoningDistillationService | undefined;
  private autoTuner?: import("../scheduler/EngineAutoTuner.js").EngineAutoTuner | undefined;
  private autoTuneTimer: NodeJS.Timeout | null = null;
  private planningTimer: NodeJS.Timeout | null = null;
  private pruningTimer: NodeJS.Timeout | null = null;
  private startTime = 0;
  private isRunning = false;

  constructor(config: DaemonConfig = {}) {
    this.config = config;
    const dbPath = config.dbPath || process.env.DB_PATH || "data/cacophony_pglite";
    this.driver = DatabaseDriverFactory.createDriver({
      dataDir: dbPath,
      sqliteDbPath: dbPath.endsWith(".db") || dbPath.endsWith(".sqlite") ? dbPath : undefined
    });
    this.maintenanceService = new DatabaseMaintenanceService({
      driver: this.driver,
      dataDirPath: dbPath
    });
    this.streamTapManager = new StreamTapManager();
    this.codeScrubber = new CodeScrubber();
  }

  /**
   * Initializes all subsystems and starts background scheduler and IPC server.
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.startTime = Date.now();

    // 0. Vault key safety check: reject the default all-zeros placeholder key
    // to prevent encrypted secrets from being trivially decryptable
    const vaultKey = process.env.VAULT_MASTER_KEY || "";
    const isDefaultKey = /^0{64}$/.test(vaultKey);
    const isTestOrDemo =
      process.env.DEMO_MODE === "true" ||
      process.env.SIMULATION_MODE === "true" ||
      process.env.NODE_ENV === "test" ||
      Boolean(process.env.NODE_TEST_CONTEXT);
    if (isDefaultKey && !isTestOrDemo) {
      console.error(
        "[CacophonyDaemon] FATAL: VAULT_MASTER_KEY is set to the default all-zeros placeholder. " +
        "Generate a real key with: openssl rand -hex 32"
      );
      process.exit(1);
    }

    // 1. Database Connection and Migrations
    await this.driver.connect();
    const migrationRunner = new MigrationRunner(this.driver);
    await migrationRunner.migrate();

    // 2. Initialize Repositories
    this.taskRepo = new TaskRepository(this.driver);
    this.stageRepo = new StageRepository(this.driver);
    this.healthRepo = new ModelHealthRepository(this.driver);
    this.telemetryRepo = new TelemetryRepository(this.driver);
    this.stackProfileRepo = new StackProfileRepository(this.driver);
    this.userSessionRepo = new UserSessionRepository(this.driver);
    this.modelProfileRepo = new ModelProfileRepository(this.driver);
    new ModelRegistryRepository(this.driver);

    // 3. Hardware Diagnostics & Telemetry
    const isDemoMode = process.env.DEMO_MODE === "true" || process.env.SIMULATION_MODE === "true";
    let telemetryProvider;
    if (isDemoMode) {
      telemetryProvider = new FallbackTelemetryProvider(true);
    } else {
      const vegaProvider = new AmdVegaTelemetryProvider();
      const isVegaAvailable = await vegaProvider.isAvailable();
      telemetryProvider = isVegaAvailable ? vegaProvider : new FallbackTelemetryProvider();
    }
    this.telemetryPoller = new TelemetryPoller({
      provider: telemetryProvider,
      repository: this.telemetryRepo,
      pollIntervalMs: this.config.pollIntervalMs || 1000
    });
    this.telemetryPoller.start();

    // 4. Single-Concurrency Task Scheduler & Autonomous Worker Pipeline
    const { OllamaModelManager } = await import("../inference/OllamaModelManager.js");
    const { ModelTenancyGuard } = await import("../scheduler/ModelTenancyGuard.js");
    const { ModelBenchmarkRunner } = await import("../scheduler/ModelBenchmarkRunner.js");

    this.modelManager = new OllamaModelManager();
    this.tenancyGuard = new ModelTenancyGuard({
      managedModelsEnabled: process.env["MANAGED_MODELS_ENABLED"] !== "false",
      protectedModels: (process.env["PROTECTED_MODELS"] || "deepseek-coder-v2:16b,qwen2.5-coder:14b,deepseek-r1:8b,qwen2.5-coder:7b-instruct-q4_K_M,gemma3:4b-it-qat,qwen2.5-coder:3b")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      maxDiskStorageGb: Number(process.env["MAX_DISK_STORAGE_GB"] || 50),
      autoEvictionEnabled: process.env["AUTO_EVICTION_ENABLED"] !== "false",
      minimumSuccessRateThreshold: Number(process.env["MIN_SUCCESS_RATE_THRESHOLD"] || 0.4),
      maxConsecutiveFailuresBeforeEviction: Number(process.env["MAX_CONSECUTIVE_FAILURES"] || 3)
    });

    const evictionManager = new ModelEvictionManager(
      this.healthRepo,
      3,
      0.25,
      this.tenancyGuard,
      this.modelManager
    );
    const governor = new ThermalGovernor();
    const groomer = new QueueGroomer();

    this.scheduler = new TaskScheduler({
      taskRepo: this.taskRepo,
      stageRepo: this.stageRepo,
      evictionManager,
      telemetryProvider,
      streamTapManager: this.streamTapManager,
      groomer,
      governor,
      defaultTimeoutMs: 2400000,
      perModelTimeoutMs: {
        "qwen2.5-coder:7b-instruct-q4_K_M": 1800000,
        "qwen2.5-coder:7b": 1800000
      }
    });

    // Wire real or simulated worker pipeline
    const { OllamaProvider } = await import("../inference/OllamaProvider.js");
    const { MockInferenceStreamProvider } = await import("../inference/MockInferenceStreamProvider.js");
    const { ContextMinimizer } = await import("../inference/ContextMinimizer.js");
    const { SelfHealingParser } = await import("../inference/SelfHealingParser.js");
    const { RulePipelineEngine } = await import("../rules/RulePipelineEngine.js");
    const { AutonomousWorkerPipeline } = await import("../scheduler/AutonomousWorkerPipeline.js");

    const primaryInferenceProvider = isDemoMode
      ? new MockInferenceStreamProvider(28)
      : new OllamaProvider({ profileRepository: this.modelProfileRepo });

    this.benchmarkRunner = new ModelBenchmarkRunner(primaryInferenceProvider as any, this.healthRepo);

    const { ReasoningDistillationService } = await import("../inference/ReasoningDistillationService.js");
    this.distillationService = new ReasoningDistillationService(primaryInferenceProvider as any);

    const { FrontierFallbackRouter } = await import("../inference/FrontierFallbackRouter.js");
    this.fallbackRouter = new FrontierFallbackRouter("deepseek-r1:8b");
    this.fallbackRouter.registerProvider({
      providerType: "ollama",
      provider: primaryInferenceProvider,
      priority: 0
    });

    const minimizer = new ContextMinimizer(process.cwd());
    const parser = new SelfHealingParser();
    const ruleEngine = new RulePipelineEngine();
    const { GitWorktreeManager } = await import("../gitea/GitWorktreeManager.js");
    const worktreeManager = new GitWorktreeManager(
      process.cwd(),
      path.resolve(process.cwd(), "workspaces")
    );

    const { GitPlatformProviderFactory } = await import("../gitea/GitPlatformProviderFactory.js");
    const { FrontierReviewer } = await import("../inference/FrontierReviewer.js");

    const gitProvider = GitPlatformProviderFactory.createFromEnv();
    const frontierReviewer = new FrontierReviewer({
      inferenceProvider: (this.fallbackRouter ?? primaryInferenceProvider) as any,
      defaultModel: process.env.FRONTIER_REVIEWER_MODEL || process.env.DEFAULT_REVIEWER_MODEL || "qwen2.5-coder:7b-instruct-q4_K_M"
    });

    const worker = new AutonomousWorkerPipeline({
      workspaceRoot: process.cwd(),
      ollamaProvider: primaryInferenceProvider as any,
      contextMinimizer: minimizer,
      parser,
      ruleEngine,
      streamTapManager: this.streamTapManager,
      stageRepository: this.stageRepo,
      taskRepository: this.taskRepo,
      worktreeManager,
      gitPlatformProvider: gitProvider,
      frontierReviewer,
      autoMerge: process.env.AUTO_MERGE_APPROVED_PRS !== "false",
      repoOwner: process.env.GIT_REPO_OWNER || "NeXeN",
      repoName: process.env.GIT_REPO_NAME || "cacophony",
      gitRemote: process.env.GIT_REMOTE || "gitea"
    });

    this.scheduler.setExecutionHandler(async (groomed, model, signal) => {
      if (isDemoMode && this.telemetryPoller) {
        this.telemetryPoller.setSimulatedActiveModel(model);
      }
      return await worker.executeTask(groomed, model, signal);
    });
    if (this.taskRepo && typeof this.taskRepo.reclaimStaleRunningTasks === "function") {
      try {
        const reclaimed = await this.taskRepo.reclaimStaleRunningTasks(15);
        if (reclaimed > 0) {
          console.log(`[CacophonyDaemon] Reclaimed ${reclaimed} stale RUNNING tasks on startup`);
        }
      } catch {
        // non-fatal
      }
    }

    this.scheduler.start(this.config.pollIntervalMs || 2000);

    // 4b. Autonomous Taskcade Planning & Self-Grooming Service
    const { TaskcadePlanningService } = await import("../inference/TaskcadePlanningService.js");
    const { FrontierTaskDecomposer } = await import("../inference/FrontierTaskDecomposer.js");
    const decomposer = new FrontierTaskDecomposer(primaryInferenceProvider as any, this.taskRepo);
    const planningService = new TaskcadePlanningService({
      taskRepo: this.taskRepo,
      stageRepo: this.stageRepo,
      decomposer,
      initialBacklog: isDemoMode
        ? [
            {
              id: "backlog-git-provider",
              category: "git_lifecycle",
              title: "Implement IGitPlatformProvider Abstraction Interface",
              description: "Create IGitPlatformProvider interface declaring createBranch, openPullRequest, submitReview, and mergePullRequest with Gitea and GitHub compatibility.",
              priority: "P1",
              role: "architect",
              modelAssigned: "deepseek-r1:8b"
            },
            {
              id: "backlog-gitea-platform",
              category: "git_lifecycle",
              title: "Implement GiteaPlatformProvider REST Client",
              description: "Implement GiteaPlatformProvider communicating with local Gitea instance via Swagger REST API in packages/engine/src/gitea/.",
              priority: "P1",
              role: "implementer",
              modelAssigned: "qwen2.5-coder:7b-instruct-q4_K_M"
            },
            {
              id: "backlog-github-platform",
              category: "git_lifecycle",
              title: "Implement GitHubPlatformProvider REST Client",
              description: "Implement GitHubPlatformProvider communicating with GitHub REST API using configured GITHUB_TOKEN in packages/engine/src/gitea/.",
              priority: "P1",
              role: "implementer",
              modelAssigned: "qwen2.5-coder:3b"
            },
            {
              id: "backlog-worktree-isolation",
              category: "git_lifecycle",
              title: "Enhance GitWorktreeManager with Ephemeral Worktree Isolation",
              description: "Create isolated ephemeral worktrees under workspaces/worktree-<taskId> and safe branch cleanup in packages/engine/src/gitea/GitWorktreeManager.ts.",
              priority: "P1",
              role: "implementer",
              modelAssigned: "qwen2.5-coder:7b-instruct-q4_K_M"
            },
            {
              id: "backlog-review-stage",
              category: "review_pipeline",
              title: "Automate Structured Stage 5 Code Review Checklist",
              description: "Wire Stage 5 Review in AutonomousWorkerPipeline to evaluate SOLID principles, test coverage, and security boundaries.",
              priority: "P1",
              role: "reviewer",
              modelAssigned: "gemma3:4b-it-qat"
            },
            {
              id: "backlog-auto-merge",
              category: "git_lifecycle",
              title: "Wire Automated Stage 6 Merge Gate",
              description: "Merge pull request into target branch when auto-merge is configured and verification stages pass in AutonomousWorkerPipeline.",
              priority: "P1",
              role: "implementer",
              modelAssigned: "qwen2.5-coder:7b-instruct-q4_K_M"
            }
          ]
        : [],
      recycleBacklog: isDemoMode
    });

    // In demo mode, run queue replenishment every 5 seconds to keep live tasks active across diverse models
    if (isDemoMode) {
      const fleetModels = ["qwen2.5-coder:7b-instruct-q4_K_M", "gemma3:4b-it-qat", "qwen2.5-coder:3b"];
      let replenishIdx = 0;
      this.planningTimer = setInterval(() => {
        if (this.isRunning) {
          const nextModel = fleetModels[replenishIdx % fleetModels.length]!;
          replenishIdx++;
          void planningService.replenishQueueIfLow({ minQueueDepth: 3, modelName: nextModel });
        }
      }, 5000);
      try {
        await planningService.replenishQueueIfLow({ minQueueDepth: 3, modelName: "qwen2.5-coder:7b-instruct-q4_K_M" });
      } catch {
        // ignore
      }
    }

    // 4c. Autonomous Engine Auto-Tuner & Profile Optimization
    const { EngineAutoTuner } = await import("../scheduler/EngineAutoTuner.js");
    this.autoTuner = new EngineAutoTuner({
      profileRepo: this.modelProfileRepo,
      healthRepo: this.healthRepo,
      hardwareSpec: {
        totalVramGb: 16,
        availableVramGb: 8
      }
    });

    // Run autonomous model profile optimization periodically every 30 minutes
    this.autoTuneTimer = setInterval(async () => {
      if (this.isRunning && this.autoTuner) {
        try {
          const modelManager = this.modelManager || new (await import("../inference/OllamaModelManager.js")).OllamaModelManager();
          const installed = await modelManager.listInstalledModels([]);
          if (installed.length > 0) {
            await this.autoTuner.autoTuneModels(installed.map((m) => m.name));
          }
        } catch {
          // ignore transient auto-tune errors
        }
      }
    }, 1800_000);

    // Run periodic database maintenance and checkpoint garbage collection
    this.pruningTimer = setInterval(async () => {
      if (this.isRunning) {
        await this.runDailyMaintenance();
      }
    }, 3600_000);


    // 5. IPC Server for CLI and Container Control
    this.ipcServer = new DaemonIPCServer({
      socketPath: this.config.socketPath,
      streamTapManager: this.streamTapManager,
      handler: this.handleCommand.bind(this)
    });
    await this.ipcServer.start();

    // 6. Unified HTTP API, SSE Streaming, and Frontend Server
    if (this.config.httpPort || this.config.frontendDistPath) {
      this.httpServer = new CacophonyHttpServer(this, {
        ...(this.config.httpPort !== undefined ? { httpPort: this.config.httpPort } : {}),
        ...(this.config.httpHost !== undefined ? { httpHost: this.config.httpHost } : {}),
        ...(this.config.frontendDistPath !== undefined ? { frontendDistPath: this.config.frontendDistPath } : {})
      });
      await this.httpServer.start();
    }

    this.isRunning = true;
  }

  /**
   * Cleanly shuts down scheduler, telemetry poller, IPC server, HTTP server, and database.
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    if (this.httpServer) {
      await this.httpServer.stop();
      this.httpServer = undefined;
    }
    if (this.planningTimer) {
      clearInterval(this.planningTimer);
      this.planningTimer = null;
    }
    if (this.autoTuneTimer) {
      clearInterval(this.autoTuneTimer);
      this.autoTuneTimer = null;
    }
    if (this.pruningTimer) {
      clearInterval(this.pruningTimer);
      this.pruningTimer = null;
    }
    if (this.scheduler) {
      this.scheduler.stop();
    }
    if (this.telemetryPoller) {
      this.telemetryPoller.stop();
    }
    if (this.ipcServer) {
      await this.ipcServer.stop();
    }
    await this.driver.close();
    this.isRunning = false;
  }

  public getStreamTapManager(): StreamTapManager {
    return this.streamTapManager;
  }

  public getScheduler(): TaskScheduler {
    return this.scheduler;
  }

  public getTaskRepository(): TaskRepository {
    return this.taskRepo;
  }

  public getMaintenanceService(): DatabaseMaintenanceService {
    return this.maintenanceService;
  }

  public getStageRepository(): StageRepository {
    return this.stageRepo;
  }

  public getModelHealthRepository(): ModelHealthRepository {
    return this.healthRepo;
  }

  public getTelemetryPoller(): TelemetryPoller {
    return this.telemetryPoller;
  }

  public getStackProfileRepository(): StackProfileRepository {
    return this.stackProfileRepo;
  }

  public getUserSessionRepository(): UserSessionRepository {
    return this.userSessionRepo;
  }

  public getModelProfileRepository(): ModelProfileRepository {
    return this.modelProfileRepo;
  }

  public getConfig(): DaemonConfig {
    return this.config;
  }

  public getFallbackRouter(): import("../inference/FrontierFallbackRouter.js").FrontierFallbackRouter | undefined {
    return this.fallbackRouter;
  }

  public getModelManager(): import("../inference/OllamaModelManager.js").OllamaModelManager | undefined {
    return this.modelManager;
  }

  public getTenancyGuard(): import("../scheduler/ModelTenancyGuard.js").ModelTenancyGuard | undefined {
    return this.tenancyGuard;
  }

  public getBenchmarkRunner(): import("../scheduler/ModelBenchmarkRunner.js").ModelBenchmarkRunner | undefined {
    return this.benchmarkRunner;
  }

  public getDistillationService(): import("../inference/ReasoningDistillationService.js").ReasoningDistillationService | undefined {
    return this.distillationService;
  }

  public getAutoTuner(): import("../scheduler/EngineAutoTuner.js").EngineAutoTuner | undefined {
    return this.autoTuner;
  }

  /**
   * Executes daily background maintenance:
   * 1. Database VACUUM ANALYZE and WAL compaction.
   * 2. Partitioning and telemetry archiving.
   * 3. Pruning expired Git shadow checkpoints.
   */
  public async runDailyMaintenance(): Promise<void> {
    try {
      await this.maintenanceService.runVacuumAndCompaction();
      await this.maintenanceService.partitionAndArchiveOldTelemetry();
      const metrics = await this.maintenanceService.getStorageMetrics();
      if (metrics.isOverThreshold) {
        process.stderr.write(
          `[storage-warning] Database directory size ${metrics.totalSizeMegabytes}MB exceeds threshold ${metrics.thresholdBytes / (1024 * 1024)}MB\n`
        );
      }
    } catch {
      // ignore transient maintenance lock contention
    }

    try {
      const { GitCheckpointManager } = await import("../gitea/GitCheckpointManager.js");
      const checkpointManager = new GitCheckpointManager(process.cwd());
      await checkpointManager.pruneOldCheckpoints(14, 50);
    } catch {
      // non-fatal checkpoint pruning error
    }
  }

  private async handleCommand(command: string, params?: Record<string, unknown>): Promise<unknown> {
    switch (command) {
      case "status": {
        const pending = await this.taskRepo.listPending();
        const latestTelemetry = this.telemetryPoller?.getLatest() || null;

        return {
          status: "ONLINE",
          uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
          pendingTasksCount: pending.length,
          activeTaskId: this.streamTapManager.getActiveTask(),
          telemetry: latestTelemetry
        };
      }

      case "pause": {
        this.scheduler.pause();
        return { message: "Task scheduler paused" };
      }

      case "resume": {
        this.scheduler.resume();
        return { message: "Task scheduler resumed" };
      }

      case "drain": {
        this.scheduler.drain();
        return { message: "Daemon running in drain mode: will stop after current tasks finish" };
      }

      case "kill": {
        setImmediate(() => {
          void this.stop();
        });
        return { message: "Daemon shutting down immediately" };
      }

      case "tasks.list": {
        const status = params?.status as string | undefined;
        if (status === "PENDING" || !status) {
          return await this.taskRepo.listPending();
        }
        return await this.taskRepo.listPending();
      }

      case "tasks.get": {
        const taskId = params?.taskId as string;
        if (!taskId) throw new Error("Missing required parameter: taskId");
        const task = await this.taskRepo.getById(taskId);
        if (!task) throw new Error(`Task '${taskId}' not found`);
        const stages = await this.stageRepo.getStagesForTask(taskId);
        return { task, stages };
      }

      case "tasks.enqueue": {
        const dto = params as unknown as EnqueueTaskDto;
        if (!dto?.title || !dto?.prompt) {
          throw new Error("Missing required parameters: title and prompt");
        }
        const now = new Date().toISOString();
        const newTask: TaskRecord = {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: dto.title,
          prompt: dto.prompt,
          role: dto.role || "implementer",
          status: "PENDING",
          priority: dto.priority || "P1",
          modelAssigned: dto.model || null,
          testCommand: dto.testCommand || null,
          focusFiles: dto.focusFiles || null,
          targetBranch: null,
          prUrl: null,
          failureCount: 0,
          createdAt: now,
          updatedAt: now,
          completedAt: null
        };
        await this.taskRepo.create(newTask);
        return newTask;
      }

      case "tasks.cancel": {
        const taskId = params?.taskId as string;
        if (!taskId) throw new Error("Missing required parameter: taskId");
        await this.taskRepo.updateStatus(taskId, "CANCELLED");
        return { message: `Task '${taskId}' cancelled` };
      }

      case "history": {
        const taskId = params?.taskId as string | undefined;
        if (taskId) {
          return await this.stageRepo.getStagesForTask(taskId);
        }
        return await this.taskRepo.listPending();
      }


      case "models": {
        return await this.healthRepo.listProfiles();
      }

      case "telemetry": {
        return this.telemetryPoller?.getLatest() || null;
      }


      case "stream.suspend": {
        const targetTask = params?.taskId as string | undefined;
        const suspended = this.streamTapManager.suspend(targetTask);
        return { suspended, taskId: targetTask || this.streamTapManager.getActiveTask() };
      }

      case "stream.resume": {
        const targetTask = params?.taskId as string | undefined;
        const resumed = this.streamTapManager.resume(targetTask);
        return { resumed, taskId: targetTask || this.streamTapManager.getActiveTask() };
      }

      case "scrub": {
        const content = params?.content as string;
        const filePath = params?.filePath as string;
        if (!content || !filePath) throw new Error("Missing content or filePath for scrub");
        return this.codeScrubber.scrubContent(content, filePath, params);
      }

      default:
        throw new Error(`Unknown command: '${command}'`);
    }
  }
}
