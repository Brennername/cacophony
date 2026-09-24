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
  UserSessionRepository
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



export interface DaemonConfig {
  readonly dbPath?: string;
  readonly socketPath?: string;
  readonly pollIntervalMs?: number;
  readonly httpPort?: number;
  readonly httpHost?: string;
  readonly frontendDistPath?: string;
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
  private telemetryPoller!: TelemetryPoller;
  private scheduler!: TaskScheduler;
  private ipcServer!: DaemonIPCServer;
  private httpServer?: CacophonyHttpServer | undefined;
  private planningTimer: NodeJS.Timeout | null = null;
  private pruningTimer: NodeJS.Timeout | null = null;
  private startTime = 0;
  private isRunning = false;

  constructor(config: DaemonConfig = {}) {
    this.config = config;
    const dbPath = config.dbPath || "data/cacophony_pglite";
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
    new ModelRegistryRepository(this.driver);

    // 3. Hardware Diagnostics & Telemetry
    const vegaProvider = new AmdVegaTelemetryProvider();
    const isVegaAvailable = await vegaProvider.isAvailable();
    const telemetryProvider = isVegaAvailable ? vegaProvider : new FallbackTelemetryProvider();
    this.telemetryPoller = new TelemetryPoller({
      provider: telemetryProvider,
      repository: this.telemetryRepo,
      pollIntervalMs: this.config.pollIntervalMs || 1000
    });
    this.telemetryPoller.start();

    // 4. Single-Concurrency Task Scheduler & Autonomous Worker Pipeline
    const evictionManager = new ModelEvictionManager(this.healthRepo);
    const governor = new ThermalGovernor();
    const groomer = new QueueGroomer();

    this.scheduler = new TaskScheduler({
      taskRepo: this.taskRepo,
      stageRepo: this.stageRepo,
      evictionManager,
      telemetryProvider,
      groomer,
      governor
    });

    // Wire real worker pipeline with Ollama, ContextMinimizer, SelfHealingParser, and RulePipelineEngine
    const { OllamaProvider } = await import("../inference/OllamaProvider.js");
    const { ContextMinimizer } = await import("../inference/ContextMinimizer.js");
    const { SelfHealingParser } = await import("../inference/SelfHealingParser.js");
    const { RulePipelineEngine } = await import("../rules/RulePipelineEngine.js");
    const { AutonomousWorkerPipeline } = await import("../scheduler/AutonomousWorkerPipeline.js");

    const ollama = new OllamaProvider();
    const minimizer = new ContextMinimizer(process.cwd());
    const parser = new SelfHealingParser();
    const ruleEngine = new RulePipelineEngine();
    const worker = new AutonomousWorkerPipeline({
      workspaceRoot: process.cwd(),
      ollamaProvider: ollama,
      contextMinimizer: minimizer,
      parser,
      ruleEngine,
      streamTapManager: this.streamTapManager,
      stageRepository: this.stageRepo
    });

    this.scheduler.setExecutionHandler((groomed, model) => worker.executeTask(groomed, model));
    this.scheduler.start(this.config.pollIntervalMs || 2000);

    // 4b. Autonomous Taskcade Planning & Self-Grooming Service
    const { TaskcadePlanningService } = await import("../inference/TaskcadePlanningService.js");
    const { FrontierTaskDecomposer } = await import("../inference/FrontierTaskDecomposer.js");
    const decomposer = new FrontierTaskDecomposer(ollama, this.taskRepo);
    const planningService = new TaskcadePlanningService({
      taskRepo: this.taskRepo,
      stageRepo: this.stageRepo,
      decomposer,
      initialBacklog: [
        {
          id: "backlog-ast-rules",
          category: "code_quality",
          title: "Implement AST Parameter Auto-Correction Rules",
          description: "Enhance rule catalog in packages/engine/src/rules/catalog/ with deterministic parameter inversion repair.",
          priority: "P1"
        },
        {
          id: "backlog-go-signature",
          category: "multi_stack",
          title: "Implement Go Struct Signature Harvester",
          description: "Add Go interface signature extraction in packages/engine/src/signature/ and test runner.",
          priority: "P1"
        },
        {
          id: "backlog-sso-oidc",
          category: "auth",
          title: "Implement Authentik and Authelia OIDC SSO Provider Discovery",
          description: "Add discovery endpoint fetcher and metadata validator in packages/engine/src/auth/.",
          priority: "P1"
        },
        {
          id: "backlog-jwt-validator",
          category: "auth",
          title: "Implement Cryptographic JWT Token Signature Verifier",
          description: "Add JWKS key rotation cache and asymmetric RS256/ES256 signature verification in packages/engine/src/auth/.",
          priority: "P1"
        },
        {
          id: "backlog-telemetry-analytics",
          category: "telemetry",
          title: "Implement Task Telemetry & Token Velocity Analytics Engine",
          description: "Add time-series statistical aggregator calculating rolling tokens/sec and APU thermal correlation.",
          priority: "P1"
        },
        {
          id: "backlog-multi-gpu-pool",
          category: "hardware",
          title: "Implement Multi-GPU Sysfs Device Discovery & Heterogeneous Pooling",
          description: "Enumerate multiple DRM cards (/sys/class/drm/card*) and balance model allocation across accelerators.",
          priority: "P1"
        },
        {
          id: "backlog-heartbeat-monitor",
          category: "fleet",
          title: "Implement Cluster Fleet Heartbeat Worker",
          description: "Add multi-node ping loop to ping cluster nodes over WebSocket and flag offline nodes.",
          priority: "P1"
        },
        {
          id: "backlog-test-isolation",
          category: "testing",
          title: "Implement Sandboxed Subprocess Test Execution Runner",
          description: "Add memory and timeout guardrails to execAsync test executions with structured stdout/stderr capture.",
          priority: "P1"
        },
        {
          id: "backlog-pglite-compactor",
          category: "database",
          title: "Implement PGlite Vacuum & WAL Auto-Compactor Daemon",
          description: "Add background maintenance task that runs VACUUM and truncates telemetry snapshots older than 14 days.",
          priority: "P2"
        },
        {
          id: "backlog-context-slicer",
          category: "context",
          title: "Implement AST Context Slicer & Focused Import Skeleton Generator",
          description: "Prune irrelevant file contents before feeding prompt to model to save context tokens.",
          priority: "P2"
        }
      ]
    });

    // Run queue replenishment every 5 seconds if pending tasks drop below 3
    this.planningTimer = setInterval(() => {
      if (this.isRunning) {
        void planningService.replenishQueueIfLow({ minQueueDepth: 3, modelName: "qwen2.5-coder:3b" });
      }
    }, 5000);
    // Initial replenishment check
    try {
      await planningService.replenishQueueIfLow({ minQueueDepth: 3, modelName: "qwen2.5-coder:3b" });
    } catch {
      // ignore
    }

    // Run periodic database maintenance (VACUUM ANALYZE, WAL compaction, telemetry partitioning) every hour
    this.pruningTimer = setInterval(async () => {
      if (this.isRunning) {
        try {
          await this.maintenanceService.runVacuumAndCompaction();
          await this.maintenanceService.partitionAndArchiveOldTelemetry();
          const metrics = await this.maintenanceService.getStorageMetrics();
          if (metrics.isOverThreshold) {
            process.stderr.write(`[storage-warning] Database directory size ${metrics.totalSizeMegabytes}MB exceeds threshold ${metrics.thresholdBytes / (1024 * 1024)}MB\n`);
          }
        } catch {
          // ignore transient maintenance lock contention
        }
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
