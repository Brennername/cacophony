import * as http from "node:http";
import * as readline from "node:readline";
import type { ToolRegistry } from "../ToolRegistry.js";
import type { ToolExecutionContext } from "../ICacophonyTool.js";

export interface McpServerConfig {
  readonly port?: number;
  readonly host?: string;
  readonly workspaceRoot: string;
  readonly enableStdio?: boolean;
}

/**
 * Model Context Protocol (MCP) compatible server exposing Cacophony tools
 * over standard input/output (stdio JSON-RPC) and HTTP / SSE streaming endpoints.
 */
export class McpServer {
  private readonly registry: ToolRegistry;
  private readonly config: McpServerConfig;
  private httpServer: http.Server | null = null;
  private sseClients: Set<http.ServerResponse> = new Set();
  private isStdioListening = false;
  private rlInterface: readline.Interface | null = null;

  constructor(registry: ToolRegistry, config: McpServerConfig) {
    this.registry = registry;
    this.config = config;
  }

  /**
   * Starts both stdio RPC loop and HTTP/SSE endpoint on configured port.
   */
  public async start(): Promise<void> {
    const port = this.config.port ?? 21264;
    const host = this.config.host ?? "0.0.0.0";

    // 1. Setup HTTP / SSE Server
    this.httpServer = http.createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    await new Promise<void>((resolve) => {
      this.httpServer?.listen(port, host, () => {
        resolve();
      });
    });

    // 2. Setup Stdio JSON-RPC Listener if enabled
    if (this.config.enableStdio) {
      this.startStdioListener();
    }
  }

  /**
   * Shuts down HTTP/SSE server and closes connections.
   */
  public async stop(): Promise<void> {
    if (this.rlInterface) {
      this.rlInterface.close();
      this.rlInterface = null;
      this.isStdioListening = false;
    }

    for (const client of this.sseClients) {
      try {
        client.end();
      } catch {
        // ignore
      }
    }
    this.sseClients.clear();

    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer?.close(() => resolve());
      });
      this.httpServer = null;
    }
  }

  /**
   * Handles JSON-RPC requests incoming over stdio.
   */
  private startStdioListener(): void {
    if (this.isStdioListening) return;
    this.isStdioListening = true;

    this.rlInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    this.rlInterface.on("line", async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const rpcRequest = JSON.parse(trimmed);
        const rpcResponse = await this.handleJsonRpc(rpcRequest);
        process.stdout.write(JSON.stringify(rpcResponse) + "\n");
      } catch (err: unknown) {
        const errorResponse = {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error: invalid JSON payload"
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + "\n");
      }
    });
  }

  /**
   * Handles HTTP endpoints for MCP discovery, tool execution, and SSE event streaming.
   */
  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // SSE Endpoint
    if (url.pathname === "/sse" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      res.write("data: " + JSON.stringify({ type: "connected", timestamp: new Date().toISOString() }) + "\n\n");
      this.sseClients.add(res);

      req.on("close", () => {
        this.sseClients.delete(res);
      });
      return;
    }

    // Discovery: List tools
    if (url.pathname === "/tools" && req.method === "GET") {
      const definitions = this.registry.getAllDefinitions();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tools: definitions }, null, 2));
      return;
    }

    // Tool execution endpoint
    if (url.pathname === "/call" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body);
          const toolName = payload.name ?? payload.toolName;
          const parameters = payload.parameters ?? payload.arguments ?? {};

          const context: ToolExecutionContext = {
            workspaceRoot: this.config.workspaceRoot,
            taskId: payload.taskId
          };

          const result = await this.registry.executeTool(
            { toolName, parameters, ...(payload.taskId ? { taskId: payload.taskId } : {}) },
            context
          );

          this.broadcastSseEvent({
            type: "tool_executed",
            toolName,
            success: result.success,
            durationMs: result.durationMs
          });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (err: unknown) {
          console.error("[McpServer] Tool execution failed:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Tool execution failed" }));
        }
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  }

  /**
   * Processes a JSON-RPC 2.0 packet according to MCP specification.
   */
  private async handleJsonRpc(rpc: any): Promise<any> {
    const id = rpc.id ?? null;
    const method = rpc.method;

    if (method === "tools/list") {
      const definitions = this.registry.getAllDefinitions().map((d) => ({
        name: d.name,
        description: d.description,
        inputSchema: {
          type: "object"
        }
      }));
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: definitions }
      };
    }

    if (method === "tools/call") {
      const toolName = rpc.params?.name;
      const parameters = rpc.params?.arguments ?? {};
      const context: ToolExecutionContext = {
        workspaceRoot: this.config.workspaceRoot
      };

      const result = await this.registry.executeTool(
        { toolName, parameters },
        context
      );

      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: result.success ? result.output : `Error: ${result.error}`
            }
          ],
          isError: !result.success
        }
      };
    }

    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    };
  }

  private broadcastSseEvent(data: Record<string, unknown>): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }
}
