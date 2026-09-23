import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { DaemonIPCClient, DEFAULT_SOCKET_PATH } from "../daemon/DaemonIPC.js";
import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";
import { CodeScrubber } from "../scrubber/CodeScrubber.js";

export class CacophonyCli {
  private readonly client: DaemonIPCClient;
  private readonly socketPath: string;

  constructor(socketPath: string = DEFAULT_SOCKET_PATH) {
    this.socketPath = socketPath;
    this.client = new DaemonIPCClient(socketPath);
  }

  /**
   * Main entrypoint evaluating CLI arguments.
   */
  public async run(args: readonly string[]): Promise<number> {
    if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
      this.printHelp();
      return 0;
    }

    const command = args[0]!;
    const rest = args.slice(1);

    try {
      switch (command) {
        // Lifecycle commands
        case "start":
          return await this.handleStart(rest);

        case "start-daemon":
          return await this.handleStartDaemon();

        case "ensure-start":
          return await this.handleEnsureStart();

        case "status":
          return await this.handleStatus();

        case "pause":
          return await this.handleSimpleCommand("pause", "Pausing scheduler");

        case "resume":
          return await this.handleSimpleCommand("resume", "Resuming scheduler");

        case "stop":
        case "shutdown-after-task":
          return await this.handleSimpleCommand("drain", "Instructing daemon to shutdown after current task");

        case "shutdown-now":
        case "kill":
          return await this.handleSimpleCommand("kill", "Instructing daemon to terminate immediately");

        // Task commands
        case "tasks":
          return await this.handleTasks(rest);

        case "history":
          return await this.handleHistory(rest);

        case "models":
          return await this.handleModels();

        case "telemetry":
          return await this.handleTelemetry();

        // Stream tap commands
        case "stream":
          return await this.handleStream(rest);

        // Code scrubber
        case "scrub":
          return await this.handleScrub(rest);

        // Command Palette execution
        case "run":
          return await this.handleCommandPalette(rest);

        default:
          console.error(`Unknown command: ${command}`);
          this.printHelp();
          return 1;
      }
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      return 1;
    }
  }

  private async handleStart(args: readonly string[]): Promise<number> {
    const isDaemonMode = args.includes("--daemon") || args.includes("-d");
    if (isDaemonMode) {
      return await this.handleStartDaemon();
    }

    const online = await this.client.isOnline();
    if (online) {
      console.log("Cacophony daemon is already running.");
      return 0;
    }

    console.log("Starting Cacophony engine in foreground...");
    const daemon = new CacophonyDaemon({ socketPath: this.socketPath });
    await daemon.start();
    console.log(`Cacophony daemon active. IPC socket: ${this.socketPath}`);

    const handleExit = async () => {
      console.log("\nShutting down Cacophony daemon...");
      await daemon.stop();
      process.exit(0);
    };

    process.on("SIGINT", () => void handleExit());
    process.on("SIGTERM", () => void handleExit());

    // Keep event loop alive
    await new Promise(() => {});
    return 0;
  }

  private async handleStartDaemon(): Promise<number> {
    const online = await this.client.isOnline();
    if (online) {
      console.log("Cacophony daemon is already running.");
      return 0;
    }

    const runnerScript = path.resolve(import.meta.dirname, "runDaemon.js");
    const child = spawn(process.execPath, [runnerScript], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, CACOPHONY_IPC_SOCKET: this.socketPath }
    });

    child.unref();

    // Poll until socket is available (up to 5 seconds)
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (await this.client.isOnline()) {
        console.log(`Cacophony daemon started successfully in background (PID ${child.pid}).`);
        return 0;
      }
    }

    console.error("Daemon started but IPC socket did not become ready in time.");
    return 1;
  }

  private async handleEnsureStart(): Promise<number> {
    const online = await this.client.isOnline();
    if (online) {
      console.log("Cacophony daemon is already online.");
      return 0;
    }
    console.log("Cacophony daemon offline. Spawning daemon process...");
    return await this.handleStartDaemon();
  }

  private async handleStatus(): Promise<number> {
    const online = await this.client.isOnline();
    if (!online) {
      console.log("Status: OFFLINE (Daemon is not running)");
      return 0;
    }

    const res = await this.client.request("status") as {
      status: string;
      uptimeSeconds: number;
      pendingTasksCount: number;
      activeTaskId: string | null;
      telemetry?: import("@cacophony/shared-types").HardwareTelemetrySnapshot;
    };

    console.log("Cacophony Arena Status: ONLINE");
    console.log(`Uptime: ${res.uptimeSeconds}s`);
    console.log(`Pending Tasks in Queue: ${res.pendingTasksCount}`);
    console.log(`Active Running Task: ${res.activeTaskId || "None (Idle)"}`);

    if (res.telemetry) {
      const { gpu, thermalZone, pacingDelaySeconds, activeModel } = res.telemetry;
      const vramUsedMb = Math.round(gpu.vramUsedBytes / (1024 * 1024));
      const vramTotalMb = Math.round(gpu.vramTotalBytes / (1024 * 1024));

      console.log("\nHardware APU Telemetry:");
      console.log(`  GPU Load: ${gpu.gpuBusyPercent}% | Thermal Zone: ${thermalZone} (Pacing Delay: ${pacingDelaySeconds}s)`);
      console.log(`  Edge Temp: ${gpu.edgeTempCelsius}C | Power: ${gpu.pptWatts}W | Clock: ${gpu.sclkMhz}MHz`);
      console.log(`  Core Voltage: ${gpu.vddgfxMilliVolts}mV | SoC: ${gpu.socMilliVolts}mV`);
      console.log(`  VRAM: ${vramUsedMb}MB / ${vramTotalMb}MB (${gpu.vramPercent.toFixed(1)}%)`);
      if (activeModel) {
        const modelVramMb = Math.round(activeModel.vramSizeBytes / (1024 * 1024));
        console.log(`  Active VRAM Model: ${activeModel.name} (${modelVramMb}MB resident)`);
      }
    }

    return 0;
  }

  private async handleSimpleCommand(command: string, description: string): Promise<number> {
    const online = await this.client.isOnline();
    if (!online) {
      console.error(`Cannot execute '${command}': Cacophony daemon is offline.`);
      return 1;
    }

    console.log(`${description}...`);
    const res = await this.client.request(command);
    console.log(JSON.stringify(res, null, 2));
    return 0;
  }

  private async handleTasks(args: readonly string[]): Promise<number> {
    const sub = args[0] || "list";

    if (sub === "list") {
      const statusArg = this.extractFlag(args, "--status");
      const res = await this.client.request("tasks.list", { status: statusArg });
      console.log(JSON.stringify(res, null, 2));
      return 0;
    }

    if (sub === "get") {
      const taskId = args[1];
      if (!taskId) {
        console.error("Usage: cacophony tasks get <taskId>");
        return 1;
      }
      const res = await this.client.request("tasks.get", { taskId });
      console.log(JSON.stringify(res, null, 2));
      return 0;
    }

    if (sub === "enqueue") {
      const title = this.extractFlag(args, "--title");
      const prompt = this.extractFlag(args, "--prompt");
      const priority = this.extractFlag(args, "--priority") || "P1";
      const role = this.extractFlag(args, "--role") || "implementer";
      const focus = this.extractFlag(args, "--focus");
      const testCmd = this.extractFlag(args, "--test");
      const allowedImportsRaw = this.extractFlag(args, "--allowed-imports");
      const allowEmojis = args.includes("--allow-emojis");

      if (!title || !prompt) {
        console.error("Usage: cacophony tasks enqueue --title=\"...\" --prompt=\"...\" [--priority=P0|P1|P2] [--focus=...] [--allowed-imports=redis,express] [--allow-emojis]");
        return 1;
      }

      const allowedImports = allowedImportsRaw ? allowedImportsRaw.split(",").map((s) => s.trim()) : undefined;

      const res = await this.client.request("tasks.enqueue", {
        title,
        prompt,
        priority,
        role,
        focusFiles: focus,
        testCommand: testCmd,
        allowedImports,
        allowEmojis
      });

      console.log("Task enqueued successfully:");
      console.log(JSON.stringify(res, null, 2));
      return 0;
    }

    if (sub === "cancel") {
      const taskId = args[1];
      if (!taskId) {
        console.error("Usage: cacophony tasks cancel <taskId>");
        return 1;
      }
      const res = await this.client.request("tasks.cancel", { taskId });
      console.log(JSON.stringify(res, null, 2));
      return 0;
    }

    console.error(`Unknown tasks subcommand: '${sub}'`);
    return 1;
  }

  private async handleHistory(args: readonly string[]): Promise<number> {
    const taskId = args[0];
    const res = await this.client.request("history", { taskId });
    console.log(JSON.stringify(res, null, 2));
    return 0;
  }

  private async handleModels(): Promise<number> {
    const res = await this.client.request("models");
    console.log(JSON.stringify(res, null, 2));
    return 0;
  }

  private async handleTelemetry(): Promise<number> {
    const res = await this.client.request("telemetry");
    console.log(JSON.stringify(res, null, 2));
    return 0;
  }

  private async handleStream(args: readonly string[]): Promise<number> {
    const sub = args[0] || "tap";

    if (sub === "tap") {
      const taskId = args[1];
      console.log(`Attaching live token stream tap ${taskId ? `for task: ${taskId}` : "(active task)"}... Press Ctrl+C to untap.\n`);

      const untap = this.client.tapStream(
        (token) => {
          process.stdout.write(token);
        },
        (msg) => {
          console.log(`[Stream Status]: ${msg}`);
        }
      );

      process.on("SIGINT", () => {
        console.log("\nDetaching from live stream...");
        untap();
        process.exit(0);
      });

      await new Promise(() => {});
      return 0;
    }

    if (sub === "suspend") {
      const taskId = args[1];
      const res = await this.client.request("stream.suspend", { taskId });
      console.log("Stream suspended:", res);
      return 0;
    }

    if (sub === "resume") {
      const taskId = args[1];
      const res = await this.client.request("stream.resume", { taskId });
      console.log("Stream resumed:", res);
      return 0;
    }

    console.error(`Unknown stream subcommand: '${sub}'`);
    return 1;
  }

  private async handleScrub(args: readonly string[]): Promise<number> {
    const targetFile = args[0];
    if (!targetFile) {
      console.error("Usage: cacophony scrub <file-path> [--stack=...] [--allowed-imports=redis] [--allow-emojis]");
      return 1;
    }

    const fullPath = path.resolve(process.cwd(), targetFile);
    if (!fs.existsSync(fullPath)) {
      console.error(`File does not exist: ${fullPath}`);
      return 1;
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const stack = this.extractFlag(args, "--stack");
    const allowedImportsRaw = this.extractFlag(args, "--allowed-imports");
    const allowEmojis = args.includes("--allow-emojis");
    const allowedImports = allowedImportsRaw ? allowedImportsRaw.split(",").map((s) => s.trim()) : undefined;

    const scrubber = new CodeScrubber();
    const result = scrubber.scrubContent(
      content,
      targetFile,
      {
        allowEmojis,
        ...(stack ? { stack } : {}),
        ...(allowedImports ? { allowedImports } : {})
      }
    );


    console.log(`Scrub evaluated: ${targetFile}`);
    console.log(`Modified: ${result.modified}`);
    console.log(`Issues Fixed (${result.issuesFixed.length}):`, result.issuesFixed);
    console.log(`Issues Detected (${result.issuesDetected.length}):`, result.issuesDetected);

    if (result.modified && args.includes("--write")) {
      fs.writeFileSync(fullPath, result.content, "utf-8");
      console.log(`Updated file persisted to ${fullPath}`);
    }

    return 0;
  }

  private async handleCommandPalette(args: readonly string[]): Promise<number> {
    const action = args[0];
    if (!action) {
      console.log("Command Palette: Available actions: status, pause, resume, drain, kill, telemetry, models, scrub");
      return 0;
    }

    const res = await this.client.request(action, { args: args.slice(1) });
    console.log(JSON.stringify(res, null, 2));
    return 0;
  }

  private extractFlag(args: readonly string[], flag: string): string | undefined {
    const prefix = `${flag}=`;
    const found = args.find((a) => a.startsWith(prefix));
    if (found) {
      return found.slice(prefix.length);
    }
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
    return undefined;
  }

  private printHelp(): void {
    console.log(`
Cacophony Unified CLI & Command Palette

Usage:
  cacophony <command> [options]

Lifecycle Commands:
  status                    Show daemon status, active task, APU hardware sensors
  start [--daemon]          Start Cacophony engine (foreground or background)
  start-daemon              Launch daemon as detached background process
  ensure-start              Start daemon if not currently running
  pause                     Pause task scheduler
  resume                    Resume task scheduler
  stop                      Drain queue: finish active task, then shutdown
  shutdown-after-task       Alias for stop
  shutdown-now              Immediately terminate daemon and active task
  kill                      Alias for shutdown-now

Task & History Commands:
  tasks list [--status=...] List pending or active tasks
  tasks get <id>            Inspect task prompt, focus files, and stage logs
  tasks enqueue [options]   Add a unit of work to the arena
  tasks cancel <id>         Cancel a scheduled or pending task
  history [id]              Query execution stages and logs for a task
  models                    Show model health leaderboard and eviction stats
  telemetry                 Sample live GPU load, VRAM, temp, and wattage

Live LLM Stream Audit:
  stream tap [id]           Attach to live token generation stream in real-time
  stream suspend [id]       Suspend generation for active task
  stream resume [id]        Resume suspended generation

Code Correction & Scrubber:
  scrub <file> [--write]    Run deterministic scrubbers on a source file

Command Palette:
  run <action> [args...]    Universal dispatcher for any registered engine command
`);
  }
}
