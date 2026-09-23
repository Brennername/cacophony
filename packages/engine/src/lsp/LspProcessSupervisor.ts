import { spawn, type ChildProcess } from "node:child_process";
import {
  type ILspClient,
  type LspClientOptions,
  type LspDiagnostic,
  type LspLocation,
  type LspSymbolInformation,
  type Position,
  DiagnosticSeverity
} from "./ILspClient.js";

interface JsonRpcMessage {
  readonly jsonrpc: "2.0";
  readonly id?: number | string;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string; readonly data?: unknown };
}

/**
 * LspProcessSupervisor
 *
 * Manages child language server processes via JSON-RPC stdio.
 * Handles framing (Content-Length header), request-response correlation,
 * notification dispatch, and compiler diagnostic buffering.
 */
export class LspProcessSupervisor implements ILspClient {
  public readonly serverName: string;
  private readonly options: LspClientOptions;
  private process: ChildProcess | null = null;
  private nextRequestId = 1;
  private readonly pendingRequests = new Map<number, { resolve: (res: unknown) => void; reject: (err: Error) => void }>();
  private readonly notificationHandlers = new Map<string, Set<(params: unknown) => void>>();
  private readonly diagnosticHandlers = new Set<(diagnostics: readonly LspDiagnostic[]) => void>();
  private readonly diagnosticStore = new Map<string, LspDiagnostic[]>();
  private buffer = Buffer.alloc(0);

  constructor(serverName: string, options: LspClientOptions) {
    this.serverName = serverName;
    this.options = options;
  }

  public get isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    const [cmd, ...args] = [this.options.serverCommand, ...(this.options.serverArgs || [])];
    this.process = spawn(cmd, args, {
      cwd: this.options.workspaceRoot,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env }
    });

    this.process.stdout?.on("data", (chunk: Buffer) => {
      this.handleIncomingData(chunk);
    });

    this.process.stderr?.on("data", (_chunk: Buffer) => {
      // Language server stderr typically contains verbose logs or debug output
    });

    this.process.on("error", (err: Error) => {
      this.rejectAllPending(err);
    });

    this.process.on("exit", (code: number | null) => {
      this.rejectAllPending(new Error(`Language server '${this.serverName}' exited with code ${code}`));
      this.process = null;
    });

    // Send initialize request
    await this.sendRequest("initialize", {
      processId: process.pid,
      rootUri: `file://${this.options.workspaceRoot}`,
      capabilities: {
        textDocument: {
          publishDiagnostics: { relatedInformation: true },
          definition: { dynamicRegistration: true },
          references: { dynamicRegistration: true },
          documentSymbol: { dynamicRegistration: true }
        }
      },
      initializationOptions: this.options.initializationOptions || {}
    });

    await this.sendNotification("initialized", {});
  }

  public async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    try {
      await this.sendRequest("shutdown", {});
      await this.sendNotification("exit", {});
    } catch {
      // Ignore errors during graceful shutdown
    } finally {
      if (this.process && !this.process.killed) {
        this.process.kill("SIGTERM");
      }
      this.process = null;
      this.rejectAllPending(new Error("LSP client stopped"));
    }
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public async sendRequest<TResult = unknown>(method: string, params?: unknown): Promise<TResult> {
    if (!this.process || !this.process.stdin) {
      throw new Error(`Language server '${this.serverName}' is not running`);
    }

    const id = this.nextRequestId++;
    const message: JsonRpcMessage = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };

    return new Promise<TResult>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (res: unknown) => void,
        reject
      });
      this.writeMessage(message);
    });
  }

  public async sendNotification(method: string, params?: unknown): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error(`Language server '${this.serverName}' is not running`);
    }

    const message: JsonRpcMessage = {
      jsonrpc: "2.0",
      method,
      params
    };
    this.writeMessage(message);
  }

  public onNotification(method: string, handler: (params: unknown) => void): () => void {
    if (!this.notificationHandlers.has(method)) {
      this.notificationHandlers.set(method, new Set());
    }
    const handlers = this.notificationHandlers.get(method)!;
    handlers.add(handler);
    return () => handlers.delete(handler);
  }

  public onDiagnostics(handler: (diagnostics: readonly LspDiagnostic[]) => void): () => void {
    this.diagnosticHandlers.add(handler);
    return () => this.diagnosticHandlers.delete(handler);
  }

  public getDiagnostics(uri?: string): readonly LspDiagnostic[] {
    if (uri) {
      return this.diagnosticStore.get(uri) || [];
    }
    const all: LspDiagnostic[] = [];
    for (const list of this.diagnosticStore.values()) {
      all.push(...list);
    }
    return all;
  }

  public async findDefinition(uri: string, position: Position): Promise<readonly LspLocation[]> {
    const res = await this.sendRequest<LspLocation | LspLocation[] | null>("textDocument/definition", {
      textDocument: { uri },
      position
    });

    if (!res) return [];
    return Array.isArray(res) ? res : [res];
  }

  public async findReferences(uri: string, position: Position): Promise<readonly LspLocation[]> {
    const res = await this.sendRequest<LspLocation[] | null>("textDocument/references", {
      textDocument: { uri },
      position,
      context: { includeDeclaration: true }
    });

    return res || [];
  }

  public async documentSymbols(uri: string): Promise<readonly LspSymbolInformation[]> {
    const res = await this.sendRequest<LspSymbolInformation[] | null>("textDocument/documentSymbol", {
      textDocument: { uri }
    });

    return res || [];
  }

  private writeMessage(message: JsonRpcMessage): void {
    const json = JSON.stringify(message);
    const body = Buffer.from(json, "utf-8");
    const header = `Content-Length: ${body.length}\r\n\r\n`;
    this.process?.stdin?.write(header);
    this.process?.stdin?.write(body);
  }

  private handleIncomingData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length > 0) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        break;
      }

      const headerText = this.buffer.subarray(0, headerEnd).toString("utf-8");
      const match = /Content-Length:\s*(\d+)/i.exec(headerText);
      if (!match || !match[1]) {
        this.buffer = this.buffer.subarray(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (this.buffer.length < messageEnd) {
        // Wait for complete message payload
        break;
      }

      const messageBytes = this.buffer.subarray(messageStart, messageEnd);
      this.buffer = this.buffer.subarray(messageEnd);

      try {
        const msg = JSON.parse(messageBytes.toString("utf-8")) as JsonRpcMessage;
        this.dispatchMessage(msg);
      } catch {
        // Ignore JSON parse errors on malformed chunks
      }
    }
  }

  private dispatchMessage(msg: JsonRpcMessage): void {
    if (msg.id !== undefined && this.pendingRequests.has(Number(msg.id))) {
      const reqId = Number(msg.id);
      const pending = this.pendingRequests.get(reqId)!;
      this.pendingRequests.delete(reqId);

      if (msg.error) {
        pending.reject(new Error(`LSP Error ${msg.error.code}: ${msg.error.message}`));
      } else {
        pending.resolve(msg.result);
      }
      return;
    }

    if (msg.method) {
      if (msg.method === "textDocument/publishDiagnostics") {
        this.handlePublishDiagnostics(msg.params as { uri: string; diagnostics: LspDiagnostic[] });
      }

      const handlers = this.notificationHandlers.get(msg.method);
      if (handlers) {
        for (const handler of handlers) {
          handler(msg.params);
        }
      }
    }
  }

  private handlePublishDiagnostics(params: { uri: string; diagnostics: LspDiagnostic[] }): void {
    if (!params || !params.uri) return;
    const normalized: LspDiagnostic[] = (params.diagnostics || []).map((d) => ({
      uri: params.uri,
      range: d.range,
      severity: d.severity || DiagnosticSeverity.Error,
      code: d.code,
      source: d.source,
      message: d.message
    }));

    this.diagnosticStore.set(params.uri, normalized);
    for (const handler of this.diagnosticHandlers) {
      handler(normalized);
    }
  }

  private rejectAllPending(err: Error): void {
    for (const pending of this.pendingRequests.values()) {
      pending.reject(err);
    }
    this.pendingRequests.clear();
  }
}
