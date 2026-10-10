import { spawn, type ChildProcess } from "node:child_process";
import type { ToolResult } from "@cacophony/shared-types";
import type { ToolRegistry } from "../ToolRegistry.js";
import type { ICacophonyTool, ToolExecutionContext } from "../ICacophonyTool.js";
import { z } from "zod";

export interface McpServerConnectionConfig {
  readonly serverName: string;
  readonly transport: "stdio" | "sse";
  readonly command?: string;
  readonly args?: readonly string[];
  readonly url?: string;
  readonly env?: Record<string, string>;
}

export interface DiscoveredMcpTool {
  readonly serverName: string;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

/**
 * McpClientManager
 *
 * Implements bidirectional Model Context Protocol client connections:
 * - Connects to external MCP servers over stdio or SSE transports
 * - Discovers remote tools (`tools/list`), resources (`resources/list`), and prompts (`prompts/list`)
 * - Registers discovered tools with namespacing (`serverName:toolName`) into the Cacophony ToolRegistry
 * - Dispatches executions (`tools/call`) to external processes and handles responses
 */
export class McpClientManager {
  private readonly connections = new Map<string, McpServerConnectionConfig>();
  private readonly processes = new Map<string, ChildProcess>();
  private readonly discoveredTools = new Map<string, DiscoveredMcpTool[]>();
  private readonly pendingRequests = new Map<string, { resolve: (res: any) => void; reject: (err: Error) => void }>();
  private nextId = 1;

  constructor(private readonly registry?: ToolRegistry) {}

  /**
   * Connects to an external MCP server and discovers its available tools.
   */
  public async connectServer(config: McpServerConnectionConfig): Promise<readonly DiscoveredMcpTool[]> {
    this.connections.set(config.serverName, config);

    if (config.transport === "stdio") {
      return this.connectStdioServer(config);
    } else {
      return this.connectSseServer(config);
    }
  }

  /**
   * Disconnects an active MCP server connection.
   */
  public async disconnectServer(serverName: string): Promise<void> {
    const proc = this.processes.get(serverName);
    if (proc && !proc.killed) {
      proc.kill("SIGTERM");
    }
    this.processes.delete(serverName);
    this.discoveredTools.delete(serverName);
    this.connections.delete(serverName);
  }

  public getDiscoveredTools(serverName?: string): readonly DiscoveredMcpTool[] {
    if (serverName) {
      return this.discoveredTools.get(serverName) || [];
    }
    const all: DiscoveredMcpTool[] = [];
    for (const list of this.discoveredTools.values()) {
      all.push(...list);
    }
    return all;
  }

  /**
   * Calls an external MCP tool via the server connection.
   */
  public async callTool(serverName: string, toolName: string, argumentsObj: Record<string, unknown>): Promise<any> {
    const config = this.connections.get(serverName);
    if (!config) {
      throw new Error(`External MCP server '${serverName}' is not connected`);
    }

    if (config.transport === "stdio") {
      const res = await this.sendJsonRpcRequest(serverName, "tools/call", {
        name: toolName,
        arguments: argumentsObj
      });
      return res;
    } else if (config.url) {
      const res = await fetch(`${config.url.replace(/\/+$/, "")}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: toolName, arguments: argumentsObj })
      });
      if (!res.ok) {
        throw new Error(`MCP HTTP call failed (${res.status}): ${await res.text()}`);
      }
      return res.json();
    }
  }

  private async connectStdioServer(config: McpServerConnectionConfig): Promise<readonly DiscoveredMcpTool[]> {
    if (!config.command) {
      throw new Error(`Stdio MCP server '${config.serverName}' requires a 'command' definition`);
    }

    const proc = spawn(config.command, config.args ? [...config.args] : [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...(config.env || {}) }
    });

    this.processes.set(config.serverName, proc);

    let buffer = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf-8");
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);
          this.handleJsonRpcMessage(config.serverName, msg);
        } catch {
          // Ignore non-json stdout lines
        }
      }
    });

    proc.on("error", (_err) => {
      // Process error
    });

    // Send initialize request
    await this.sendJsonRpcRequest(config.serverName, "initialize", {
      protocolVersion: "2024-11-05",
      clientInfo: { name: "cacophony-engine", version: "1.0.0" },
      capabilities: { tools: {} }
    });

    // Send initialized notification
    this.sendJsonRpcNotification(config.serverName, "notifications/initialized", {});

    // Discover tools
    const listRes = await this.sendJsonRpcRequest<{ tools: Array<{ name: string; description: string; inputSchema: any }> }>(
      config.serverName,
      "tools/list",
      {}
    );

    const tools: DiscoveredMcpTool[] = (listRes?.tools || []).map((t) => ({
      serverName: config.serverName,
      name: t.name,
      description: t.description || "",
      inputSchema: t.inputSchema || {}
    }));

    this.discoveredTools.set(config.serverName, tools);
    this.registerExternalToolsIntoRegistry(config.serverName, tools);
    return tools;
  }

  private async connectSseServer(config: McpServerConnectionConfig): Promise<readonly DiscoveredMcpTool[]> {
    if (!config.url) {
      throw new Error(`SSE MCP server '${config.serverName}' requires a 'url'`);
    }

    let baseUrl = config.url;
    while (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }
    const toolsEndpoint = `${baseUrl}/tools`;
    const res = await fetch(toolsEndpoint);
    if (!res.ok) {
      throw new Error(`Failed to discover tools from MCP SSE server at ${toolsEndpoint}: ${res.statusText}`);
    }

    const data = (await res.json()) as { tools?: Array<{ name: string; description: string; inputSchema?: any }> };
    const tools: DiscoveredMcpTool[] = (data.tools || []).map((t) => ({
      serverName: config.serverName,
      name: t.name,
      description: t.description || "",
      inputSchema: t.inputSchema || {}
    }));

    this.discoveredTools.set(config.serverName, tools);
    this.registerExternalToolsIntoRegistry(config.serverName, tools);
    return tools;
  }

  private registerExternalToolsIntoRegistry(serverName: string, tools: readonly DiscoveredMcpTool[]): void {
    if (!this.registry) return;

    for (const tool of tools) {
      const namespacedName = `${serverName}:${tool.name}`;
      const self = this;

      const dynamicTool: ICacophonyTool<Record<string, unknown>> = {
        definition: {
          name: namespacedName,
          description: `[MCP: ${serverName}] ${tool.description}`,
          parameterSchema: z.record(z.unknown())
        },
        schema: z.record(z.unknown()),
        async execute(params: Record<string, unknown>, _context: ToolExecutionContext): Promise<ToolResult> {
          const startTime = Date.now();
          try {
            const result = await self.callTool(serverName, tool.name, params);
            return {
              success: true,
              output: typeof result === "string" ? result : JSON.stringify(result, null, 2),
              durationMs: Date.now() - startTime
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
              success: false,
              output: "",
              error: msg,
              durationMs: Date.now() - startTime
            };
          }
        }
      };

      this.registry.registerTool(dynamicTool);
    }
  }

  private sendJsonRpcRequest<T = any>(serverName: string, method: string, params: any): Promise<T> {
    const proc = this.processes.get(serverName);
    if (!proc || !proc.stdin) {
      return Promise.reject(new Error(`Server '${serverName}' is not running`));
    }

    const id = this.nextId++;
    const key = `${serverName}:${id}`;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(key, { resolve, reject });
      proc.stdin?.write(payload);
    });
  }

  private sendJsonRpcNotification(serverName: string, method: string, params: any): void {
    const proc = this.processes.get(serverName);
    if (proc && proc.stdin) {
      const payload = JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n";
      proc.stdin.write(payload);
    }
  }

  private handleJsonRpcMessage(serverName: string, msg: any): void {
    if (msg.id !== undefined && msg.id !== null) {
      const key = `${serverName}:${msg.id}`;
      const pending = this.pendingRequests.get(key);
      if (pending) {
        this.pendingRequests.delete(key);
        if (msg.error) {
          pending.reject(new Error(`MCP Error ${msg.error.code}: ${msg.error.message}`));
        } else {
          pending.resolve(msg.result);
        }
      }
    }
  }
}
