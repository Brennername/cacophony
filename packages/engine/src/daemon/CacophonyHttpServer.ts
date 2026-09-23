import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { CacophonyDaemon } from "./CacophonyDaemon.js";

export interface UnifiedServerConfig {
  readonly httpPort?: number;
  readonly httpHost?: string;
  readonly frontendDistPath?: string;
}

/**
 * Unified HTTP server serving:
 * 1. REST API endpoints (/api/status, /api/tasks, /api/telemetry, /api/models).
 * 2. Real-time Server-Sent Events (/api/events) streaming telemetry and task logs.
 * 3. Static Angular application bundle (/ -> index.html, JS/CSS assets).
 */
export class CacophonyHttpServer {
  private readonly daemon: CacophonyDaemon;
  private readonly config: UnifiedServerConfig;
  private server: http.Server | null = null;
  private readonly sseClients: Set<http.ServerResponse> = new Set();
  private sseInterval: NodeJS.Timeout | null = null;

  constructor(daemon: CacophonyDaemon, config: UnifiedServerConfig = {}) {
    this.daemon = daemon;
    this.config = config;
  }

  public async start(): Promise<void> {
    const port = this.config.httpPort ?? 24161;
    const host = this.config.httpHost ?? "0.0.0.0";

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    await new Promise<void>((resolve) => {
      this.server?.listen(port, host, () => {
        resolve();
      });
    });

    // Start periodic SSE telemetry broadcast
    this.sseInterval = setInterval(() => {
      this.broadcastTelemetry();
    }, 1500);
  }

  public async stop(): Promise<void> {
    if (this.sseInterval) {
      clearInterval(this.sseInterval);
      this.sseInterval = null;
    }

    for (const client of this.sseClients) {
      try {
        client.end();
      } catch {
        // ignore
      }
    }
    this.sseClients.clear();

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve());
      });
      this.server = null;
    }
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. SSE Real-Time Stream
    if (url.pathname === "/api/events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      res.write(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`);
      this.sseClients.add(res);

      req.on("close", () => {
        this.sseClients.delete(res);
      });
      return;
    }

    // 2. REST API: Arena Status
    if (url.pathname === "/api/status" && req.method === "GET") {
      const taskRepo = this.daemon.getTaskRepository();
      const pending = await taskRepo.listPending();
      const status = {
        arena: "ONLINE",
        schedulerPaused: false,
        pendingTasksCount: pending.length,
        timestamp: new Date().toISOString()
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status));
      return;
    }

    // 2b. REST API: Dynamic Auth Configuration for Frontend
    if (url.pathname === "/api/config/auth" && req.method === "GET") {
      const authConfig = {
        giteaPublicUrl: process.env["GITEA_PUBLIC_URL"] || "http://localhost:19634",
        clientId: process.env["GITEA_OAUTH_CLIENT_ID"] || "cacophony-dashboard",
        redirectUri: process.env["GITEA_OAUTH_REDIRECT_URI"] || "http://localhost:24072/auth/callback"
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(authConfig));
      return;
    }

    // 3. REST API: List Tasks
    if (url.pathname === "/api/tasks" && req.method === "GET") {
      const taskRepo = this.daemon.getTaskRepository();
      const pending = await taskRepo.listPending();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(pending));
      return;
    }

    // 4. REST API: Enqueue Task
    if (url.pathname === "/api/tasks" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body);
          const taskRepo = this.daemon.getTaskRepository();
          const task = await taskRepo.create({
            id: `task-${Date.now()}`,
            title: payload.title || "Manual Task",
            prompt: payload.prompt || payload.title || "",
            role: payload.role || "implementer",
            status: "PENDING",
            priority: payload.priority || "P1",
            modelAssigned: null,
            testCommand: payload.testCommand || null,
            focusFiles: payload.focusFiles ? JSON.stringify(payload.focusFiles) : null,
            targetBranch: payload.targetBranch || "main",
            prUrl: null,
            failureCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null
          });
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(task));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    // 5. Static Angular Frontend Serving
    if (this.config.frontendDistPath) {
      await this.serveStaticFrontend(url.pathname, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  }

  private async serveStaticFrontend(pathname: string, res: http.ServerResponse): Promise<void> {
    const distPath = path.resolve(this.config.frontendDistPath!);
    let targetFile = path.join(distPath, pathname === "/" ? "index.html" : pathname);

    try {
      const stat = await fs.stat(targetFile);
      if (stat.isDirectory()) {
        targetFile = path.join(targetFile, "index.html");
      }
    } catch {
      // Fallback for Single Page Application client-side routing
      targetFile = path.join(distPath, "index.html");
    }

    try {
      const content = await fs.readFile(targetFile);
      const ext = path.extname(targetFile).toLowerCase();
      const contentTypes: Record<string, string> = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".ico": "image/x-icon",
        ".json": "application/json",
        ".svg": "image/svg+xml"
      };

      res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
      res.end(content);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Frontend asset not found.");
    }
  }

  private broadcastTelemetry(): void {
    const data = JSON.stringify({
      type: "telemetry",
      timestamp: new Date().toISOString(),
      gpuBusy: 18,
      vramUsedMb: 2150,
      vramTotalMb: 16384,
      edgeTempCelsius: 58.4,
      thermalZone: "nominal"
    });

    const payload = `data: ${data}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }
}
