import * as net from "node:net";
import * as fs from "node:fs";
import { EventEmitter } from "node:events";
import type { StreamTapManager } from "../inference/StreamTapManager.js";

export const DEFAULT_SOCKET_PATH = process.env.CACOPHONY_IPC_SOCKET || "/tmp/cacophony.sock";

export interface IPCRequest {
  readonly id: string;
  readonly command: string;
  readonly params?: Record<string, unknown> | undefined;
}

export interface IPCResponse {
  readonly id: string;
  readonly success: boolean;
  readonly data?: unknown | undefined;
  readonly error?: string | undefined;
}

export interface IPCStreamEvent {
  readonly type: "stream_token" | "stream_suspended" | "stream_resumed";
  readonly taskId: string;
  readonly token?: string | undefined;
}

export type CommandHandler = (
  command: string,
  params?: Record<string, unknown> | undefined
) => Promise<unknown>;

export interface DaemonIPCServerOptions {
  readonly socketPath?: string | undefined;
  readonly handler: CommandHandler;
  readonly streamTapManager: StreamTapManager;
}

/**
 * DaemonIPCServer
 *
 * Exposes a Unix domain socket server allowing external CLI processes,
 * container executors, and scripts to control the daemon lifecycle, query states,
 * and tap live LLM generation token streams.
 */
export class DaemonIPCServer {
  private readonly socketPath: string;
  private readonly handler: CommandHandler;
  private readonly streamTapManager: StreamTapManager;
  private server: net.Server | null = null;
  private readonly clients = new Set<net.Socket>();
  private readonly streamSubscribers = new Set<net.Socket>();
  private untapListener: (() => void) | null = null;

  constructor(options: DaemonIPCServerOptions) {

    this.socketPath = options.socketPath || DEFAULT_SOCKET_PATH;
    this.handler = options.handler;
    this.streamTapManager = options.streamTapManager;
  }

  /**
   * Starts listening on the Unix domain socket.
   */
  public async start(): Promise<void> {
    // Remove stale socket if present
    if (fs.existsSync(this.socketPath)) {
      try {
        fs.unlinkSync(this.socketPath);
      } catch {
        // Ignore unlink error
      }
    }

    // Subscribe to live LLM stream tap
    this.untapListener = this.streamTapManager.tap((event) => {
      this.broadcastStreamEvent({
        type: "stream_token",
        taskId: event.taskId,
        token: event.token
      });
    });

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleClient(socket);
      });

      this.server.on("error", (err) => {
        reject(err);
      });

      this.server.listen(this.socketPath, () => {
        resolve();
      });
    });
  }

  /**
   * Stops the IPC server and cleans up the socket.
   */
  public async stop(): Promise<void> {
    if (this.untapListener) {
      this.untapListener();
      this.untapListener = null;
    }

    for (const client of this.clients) {
      client.destroy();
    }
    this.clients.clear();
    this.streamSubscribers.clear();

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve());
      });
      this.server = null;
    }

    if (fs.existsSync(this.socketPath)) {
      try {
        fs.unlinkSync(this.socketPath);
      } catch {
        // Ignore
      }
    }
  }

  private handleClient(socket: net.Socket): void {
    this.clients.add(socket);
    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf-8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const req = JSON.parse(trimmed) as IPCRequest;
          void this.processRequest(socket, req);
        } catch (err) {
          const res: IPCResponse = {
            id: "unknown",
            success: false,
            error: `Malformed JSON-RPC request: ${err instanceof Error ? err.message : String(err)}`
          };
          socket.write(JSON.stringify(res) + "\n");
        }
      }
    });

    socket.on("close", () => {
      this.clients.delete(socket);
      this.streamSubscribers.delete(socket);
    });

    socket.on("error", () => {
      this.clients.delete(socket);
      this.streamSubscribers.delete(socket);
    });
  }

  private async processRequest(socket: net.Socket, req: IPCRequest): Promise<void> {
    if (req.command === "stream.tap") {
      this.streamSubscribers.add(socket);
      const res: IPCResponse = {
        id: req.id,
        success: true,
        data: { message: "Stream tap attached successfully", activeTaskId: this.streamTapManager.getActiveTask() }
      };
      socket.write(JSON.stringify(res) + "\n");
      return;
    }

    if (req.command === "stream.untap") {
      this.streamSubscribers.delete(socket);
      const res: IPCResponse = {
        id: req.id,
        success: true,
        data: { message: "Stream tap detached successfully" }
      };
      socket.write(JSON.stringify(res) + "\n");
      return;
    }

    try {
      const data = await this.handler(req.command, req.params);
      const res: IPCResponse = {
        id: req.id,
        success: true,
        data
      };
      socket.write(JSON.stringify(res) + "\n");
    } catch (err) {
      const res: IPCResponse = {
        id: req.id,
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
      socket.write(JSON.stringify(res) + "\n");
    }
  }

  private broadcastStreamEvent(event: IPCStreamEvent): void {
    if (this.streamSubscribers.size === 0) return;
    const payload = JSON.stringify(event) + "\n";
    for (const socket of this.streamSubscribers) {
      try {
        socket.write(payload);
      } catch {
        this.streamSubscribers.delete(socket);
      }
    }
  }
}

/**
 * DaemonIPCClient
 *
 * Client adapter used by the CLI to query and dispatch commands to the running daemon.
 */
export class DaemonIPCClient extends EventEmitter {
  private readonly socketPath: string;

  constructor(socketPath: string = DEFAULT_SOCKET_PATH) {
    super();
    this.socketPath = socketPath;
  }

  /**
   * Checks whether the daemon is actively listening on the IPC socket.
   */
  public async isOnline(): Promise<boolean> {
    if (!fs.existsSync(this.socketPath)) return false;

    return new Promise((resolve) => {
      const socket = net.createConnection(this.socketPath, () => {
        socket.destroy();
        resolve(true);
      });

      socket.on("error", () => {
        resolve(false);
      });
    });
  }

  /**
   * Sends a command request to the daemon and returns the parsed response.
   */
  public async request(command: string, params?: Record<string, unknown>, timeoutMs = 10000): Promise<unknown> {
    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const payload: IPCRequest = params !== undefined ? { id, command, params } : { id, command };



    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.socketPath);
      let buffer = "";
      let timer: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        socket.destroy();
      };

      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`IPC request '${command}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      socket.on("connect", () => {
        socket.write(JSON.stringify(payload) + "\n");
      });

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const res = JSON.parse(trimmed) as IPCResponse;
            if (res.id === id) {
              cleanup();
              if (res.success) {
                resolve(res.data);
              } else {
                reject(new Error(res.error || "IPC command failed"));
              }
              return;
            }
          } catch {
            // Ignore parse errors
          }
        }
      });

      socket.on("error", (err) => {
        cleanup();
        reject(err);
      });
    });
  }

  /**
   * Attaches to the live LLM stream, invoking onToken callback for each generated token.
   */
  public tapStream(
    onToken: (token: string, taskId: string) => void,
    onStatus?: (msg: string) => void
  ): () => void {
    const socket = net.createConnection(this.socketPath);
    let buffer = "";
    const id = `tap_${Date.now()}`;

    socket.on("connect", () => {
      const tapReq: IPCRequest = { id, command: "stream.tap" };
      socket.write(JSON.stringify(tapReq) + "\n");
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf-8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed) as IPCStreamEvent | IPCResponse;
          if ("type" in parsed && parsed.type === "stream_token" && parsed.token) {
            onToken(parsed.token, parsed.taskId);
          } else if ("data" in parsed && onStatus) {
            onStatus(JSON.stringify(parsed.data));
          }
        } catch {
          // Ignore
        }
      }
    });

    return () => {
      try {
        const untapReq: IPCRequest = { id: `untap_${Date.now()}`, command: "stream.untap" };
        socket.write(JSON.stringify(untapReq) + "\n");
        socket.destroy();
      } catch {
        // Ignore
      }
    };
  }
}
