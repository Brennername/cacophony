import { EventEmitter } from "node:events";

export interface JsonRpcRequest {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  readonly jsonrpc: "2.0";
  readonly id: string | number | null;
  readonly result?: unknown;
  readonly error?: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

export interface JsonRpcNotification {
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly params: Record<string, unknown>;
}

export type RpcMethodHandler = (params: Record<string, unknown>) => Promise<unknown> | unknown;

/**
 * HeadlessServerProtocol handles JSON-RPC 2.0 dispatching, bi-directional RPC
 * for IDE integrations (VS Code, Cursor), and event streaming notifications.
 */
export class HeadlessServerProtocol extends EventEmitter {
  private readonly handlers: Map<string, RpcMethodHandler> = new Map();
  private readonly authToken: string | null;

  constructor(options: { readonly authToken?: string | null } = {}) {
    super();
    this.authToken = options.authToken ?? null;
  }

  public registerMethod(method: string, handler: RpcMethodHandler): void {
    this.handlers.set(method, handler);
  }

  /**
   * Processes an incoming JSON-RPC 2.0 message string.
   */
  public async handleMessage(rawMessage: string, incomingToken?: string): Promise<string | null> {
    if (this.authToken && incomingToken !== this.authToken) {
      const errResp: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: "Unauthorized: Invalid or missing authentication token" }
      };
      return JSON.stringify(errResp);
    }

    let parsed: JsonRpcRequest;
    try {
      parsed = JSON.parse(rawMessage) as JsonRpcRequest;
    } catch {
      const errResp: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: Invalid JSON" }
      };
      return JSON.stringify(errResp);
    }

    if (parsed.jsonrpc !== "2.0" || !parsed.method) {
      const errResp: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: parsed.id ?? null,
        error: { code: -32600, message: "Invalid Request: Missing required jsonrpc or method" }
      };
      return JSON.stringify(errResp);
    }

    const handler = this.handlers.get(parsed.method);
    if (!handler) {
      const errResp: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: parsed.id,
        error: { code: -32601, message: `Method not found: ${parsed.method}` }
      };
      return JSON.stringify(errResp);
    }

    try {
      const result = await handler(parsed.params || {});
      const resp: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: parsed.id,
        result
      };
      return JSON.stringify(resp);
    } catch (err) {
      const resp: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: parsed.id,
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : String(err)
        }
      };
      return JSON.stringify(resp);
    }
  }

  /**
   * Emits a JSON-RPC 2.0 streaming notification.
   */
  public createNotification(method: string, params: Record<string, unknown>): string {
    const notif: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      params
    };
    return JSON.stringify(notif);
  }
}
