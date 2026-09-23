import {
  PGliteDriver,
  MigrationRunner,
  TaskRepository,
  StageRepository,
  ModelHealthRepository,
  TelemetryRepository,
  StackProfileRepository,
  ModelRegistryRepository
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
  private readonly driver: PGliteDriver;
  private readonly streamTapManager: StreamTapManager;
  private readonly codeScrubber: CodeScrubber;
  private taskRepo!: TaskRepository;
  private stageRepo!: StageRepository;
  private healthRepo!: ModelHealthRepository;
  private telemetryRepo!: TelemetryRepository;
  private stackProfileRepo!: StackProfileRepository;
  private telemetryPoller!: TelemetryPoller;
  private scheduler!: TaskScheduler;
  private ipcServer!: DaemonIPCServer;
  private httpServer?: CacophonyHttpServer | undefined;
  private startTime = 0;
  private isRunning = false;

  constructor(config: DaemonConfig = {}) {
    this.config = config;
    this.driver = new PGliteDriver(config.dbPath || "data/cacophony_pglite");
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

    // 4. Single-Concurrency Task Scheduler
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

    this.scheduler.start(this.config.pollIntervalMs || 2000);

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

  public getStackProfileRepository(): StackProfileRepository {
    return this.stackProfileRepo;
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
