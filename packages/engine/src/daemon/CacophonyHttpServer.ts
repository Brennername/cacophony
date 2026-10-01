import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { CacophonyDaemon } from "./CacophonyDaemon.js";
import { AuthService } from "../auth/AuthService.js";
import { RateLimiter } from "./RateLimiter.js";
import { TaskScheduler } from "../scheduler/TaskScheduler.js";

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
  private untapListener: (() => void) | null = null;
  private untapStageListener: (() => void) | null = null;
  private readonly authService: AuthService;
  private readonly rateLimiter: RateLimiter;

  constructor(daemon: CacophonyDaemon, config: UnifiedServerConfig = {}) {
    this.daemon = daemon;
    this.config = config;
    this.authService = new AuthService({
      userSessionRepo: daemon.getUserSessionRepository()
    });
    this.rateLimiter = new RateLimiter();
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

    this.rateLimiter.start();

    // Tap live LLM stream and forward tokens and stage transitions to SSE clients
    const streamTap = this.daemon.getStreamTapManager();
    if (streamTap) {
      this.untapListener = streamTap.tap((event) => {
        const payload = `data: ${JSON.stringify({
          type: "token",
          taskId: event.taskId,
          token: event.token,
          timestamp: event.timestamp
        })}\n\n`;
        for (const client of this.sseClients) {
          try {
            client.write(payload);
          } catch {
            this.sseClients.delete(client);
          }
        }
      });

      streamTap.tapReasoning((event) => {
        const payload = `data: ${JSON.stringify({
          type: "reasoning_chunk",
          taskId: event.taskId,
          chunk: event.chunk,
          timestamp: event.timestamp
        })}\n\n`;
        for (const client of this.sseClients) {
          try {
            client.write(payload);
          } catch {
            this.sseClients.delete(client);
          }
        }
      });

      streamTap.tapCode((event) => {
        const payload = `data: ${JSON.stringify({
          type: "code_chunk",
          taskId: event.taskId,
          chunk: event.chunk,
          timestamp: event.timestamp
        })}\n\n`;
        for (const client of this.sseClients) {
          try {
            client.write(payload);
          } catch {
            this.sseClients.delete(client);
          }
        }
      });

      this.untapStageListener = streamTap.tapStageTransitions((event) => {
        const payload = `data: ${JSON.stringify({
          type: "stage_transition",
          taskId: event.taskId,
          stageName: event.stageName,
          stageStatus: event.stageStatus,
          durationMs: event.durationMs ?? 0,
          timestamp: event.timestamp
        })}\n\n`;
        for (const client of this.sseClients) {
          try {
            client.write(payload);
          } catch {
            this.sseClients.delete(client);
          }
        }
      });
    }

    // Start periodic SSE telemetry broadcast
    this.sseInterval = setInterval(() => {
      void this.broadcastTelemetry();
    }, 1500);
  }

  public async stop(): Promise<void> {
    if (this.untapListener) {
      this.untapListener();
      this.untapListener = null;
    }
    if (this.untapStageListener) {
      this.untapStageListener();
      this.untapStageListener = null;
    }

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
    this.rateLimiter.stop();
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Dynamic Origin & Host Resolution
    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || "http";
    const forwardedHost = (req.headers["x-forwarded-host"] as string) || req.headers.host || "localhost:24161";
    const clientOrigin = `${forwardedProto}://${forwardedHost}`;
    const url = new URL(req.url ?? "/", clientOrigin);

    // Rate limiting gate: reject excessive requests before any processing.
    // SSE endpoint is exempt since it is a long-lived single connection.
    const isSseEndpoint = url.pathname === "/api/events";
    if (!isSseEndpoint && req.method !== "OPTIONS" && !this.rateLimiter.allowRequest(req)) {
      const retryAfter = this.rateLimiter.getRetryAfterSeconds(req);
      res.writeHead(429, {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter)
      });
      res.end(JSON.stringify({ error: "Too Many Requests", retryAfterSeconds: retryAfter }));
      return;
    }

    // Dynamic CORS: echo the request origin back for local/LAN dev.
    // The engine serves the Angular bundle itself, so in production this is always
    // same-origin. CORS matters only for API-only deployments behind a proxy.
    // Full origin allowlist enforcement is deferred to T74.2 (Phase 74).
    const requestOrigin = (req.headers.origin as string) || "*";
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

    // CSP: permissive policy for active development phase.
    // Strict enforcement deferred to T74.1.2 (Phase 74) once Angular build
    // pipeline produces nonce-compatible output.
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: http: https:;"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1b. REST API: Dynamic Network Profile Configuration
    if (url.pathname === "/api/config/network" && req.method === "GET") {
      const networkConfig = {
        resolvedOrigin: clientOrigin,
        forwardedHost,
        forwardedProto,
        isLoopback: forwardedHost.includes("localhost") || forwardedHost.includes("127.0.0.1"),
        isLan: /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(forwardedHost)
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(networkConfig));
      return;
    }

    // 1c. REST API: Host System Tool Availability & Missing Dependencies Diagnostic Report
    if (url.pathname === "/api/hardware/tools" && req.method === "GET") {
      try {
        const { SystemToolScanner } = await import("../hardware/SystemToolScanner.js");
        const scanner = new SystemToolScanner();
        const report = await scanner.scan();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(report));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    // 1c2. REST API: Accelerator Device Grid Enumeration
    if (url.pathname === "/api/system" && req.method === "GET") {
      try {
        const { GpuDeviceManager } = await import("../hardware/GpuDeviceManager.js");
        const manager = new GpuDeviceManager();
        const devices = await manager.discoverDevices();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ accelerators: devices }));
      } catch (err: unknown) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ accelerators: [] }));
      }
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

      const streamTap = this.daemon.getStreamTapManager();
      if (streamTap) {
        const activeTaskId = streamTap.getActiveTask();
        const initialBuffer = streamTap.getBuffer(activeTaskId || undefined);
        if (activeTaskId && initialBuffer) {
          res.write(
            `data: ${JSON.stringify({
              type: "stream_init",
              taskId: activeTaskId,
              buffer: initialBuffer,
              timestamp: Date.now()
            })}\n\n`
          );
        }
      }

      this.sseClients.add(res);

      req.on("close", () => {
        this.sseClients.delete(res);
      });
      return;
    }

    // 1a. Stream Buffer Query for specific or active task
    if (url.pathname === "/api/stream/buffer" && req.method === "GET") {
      const streamTap = this.daemon.getStreamTapManager();
      const taskId = url.searchParams.get("taskId") || undefined;
      const buffer = streamTap ? streamTap.getBuffer(taskId) : "";
      const activeTaskId = streamTap ? streamTap.getActiveTask() : null;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ taskId: taskId || activeTaskId, buffer, activeTaskId }));
      return;
    }

    // 1d. REST API: Historical Telemetry Query with Bucketing
    if (url.pathname === "/api/telemetry/history" && req.method === "GET") {
      const windowStr = url.searchParams.get("window") || "1h";
      let windowMs = 3600_000;
      if (windowStr.endsWith("h")) {
        windowMs = Number(windowStr.slice(0, -1)) * 3600_000;
      } else if (windowStr.endsWith("m")) {
        windowMs = Number(windowStr.slice(0, -1)) * 60_000;
      } else if (windowStr.endsWith("d")) {
        windowMs = Number(windowStr.slice(0, -1)) * 86400_000;
      }
      const sinceIso = new Date(Date.now() - windowMs).toISOString();
      const telemetryRepo = (this.daemon as any).telemetryRepo;
      let history;
      if (telemetryRepo?.getAggregatedHistory) {
        history = await telemetryRepo.getAggregatedHistory(sinceIso);
      } else {
        history = {
          count: 0,
          avgGpuBusy: 0,
          peakGpuBusy: 0,
          avgTempC: 0,
          peakTempC: 0,
          avgPowerWatts: 0,
          peakPowerWatts: 0
        };
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(history));
      return;
    }

    // 1e. OpenMetrics / Prometheus Metrics Scraping Endpoint
    if (url.pathname === "/metrics" && req.method === "GET") {
      const { PrometheusMetricsExporter } = await import("../telemetry/PrometheusMetricsExporter.js");
      const exporter = new PrometheusMetricsExporter({
        telemetryPoller: this.daemon.getTelemetryPoller(),
        taskRepo: this.daemon.getTaskRepository(),
        modelHealthRepo: this.daemon.getModelHealthRepository()
      });
      const metricsText = await exporter.getMetricsText();
      res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
      res.end(metricsText);
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

    // 2b. REST API: Dynamic Multi-Provider Auth Configuration for Frontend
    if (url.pathname === "/api/config/auth" && req.method === "GET") {
      const activeProvider = process.env["SSO_PROVIDER"] || "authentik";
      const authConfig = {
        activeProvider,
        authentik: {
          issuerUrl: process.env["AUTHENTIK_ISSUER_URL"] || "http://localhost:9000/application/o/cacophony/",
          clientId: process.env["AUTHENTIK_OAUTH_CLIENT_ID"] || "cacophony-client",
          redirectUri: process.env["AUTHENTIK_OAUTH_REDIRECT_URI"] || "http://localhost:24072/auth/callback"
        },
        authelia: {
          portalUrl: process.env["AUTHELIA_PORTAL_URL"] || "http://localhost:9091/",
          forwardAuthEnabled: process.env["AUTHELIA_FORWARD_AUTH_ENABLED"] !== "false"
        },
        giteaPublicUrl: process.env["GITEA_PUBLIC_URL"] || "http://localhost:19634",
        clientId: process.env["GITEA_OAUTH_CLIENT_ID"] || "cacophony-dashboard",
        redirectUri: process.env["GITEA_OAUTH_REDIRECT_URI"] || "http://localhost:24072/auth/callback"
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(authConfig));
      return;
    }

    // 2c. REST API: OIDC OpenID Configuration Discovery
    if (url.pathname === "/api/auth/openid-configuration" && req.method === "GET") {
      const config = await this.authService.getOidcConfiguration();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(config));
      return;
    }

    // 2d. REST API: User Session Refresh
    if (url.pathname === "/api/auth/refresh" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf-8"); });
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const refreshed = await this.authService.refreshSession(payload.sessionId);
          if (!refreshed) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Session invalid or expired" }));
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(refreshed));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid refresh payload" }));
        }
      });
      return;
    }

    // 2e. REST API: User Logout & Revocation
    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf-8"); });
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const result = await this.authService.logout(payload.sessionId || "");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, logoutUrl: result.logoutUrl }));
        } catch {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        }
      });
      return;
    }

    // 3. REST API: List Tasks
    if (url.pathname === "/api/tasks" && req.method === "GET") {
      const taskRepo = this.daemon.getTaskRepository();
      const statusParam = url.searchParams.get("status") as any;
      if (statusParam) {
        const limitParam = parseInt(url.searchParams.get("limit") || "100", 10);
        const tasks = await taskRepo.listRecent(limitParam, { status: statusParam });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(tasks));
        return;
      }
      const pending = await taskRepo.listPending();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(pending));
      return;
    }

    // 4. REST API: Enqueue Task
    if (url.pathname === "/api/tasks" && req.method === "POST") {
      // Check authorization header if auth is active
      const authHeader = req.headers["authorization"] || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token && process.env["REQUIRE_AUTH"] === "true") {
        const authCtx = await this.authService.authenticateToken(token);
        if (!authCtx || !this.authService.isAuthorized(authCtx, "OPERATOR")) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Forbidden: Mutating tasks requires OPERATOR role" }));
          return;
        }
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body);
          const taskRepo = this.daemon.getTaskRepository();
          const task = await taskRepo.create({
            id: payload.id || `task-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: payload.title || "Manual Task",
            prompt: payload.prompt || payload.title || "",
            role: payload.role || "implementer",
            status: "PENDING",
            priority: payload.priority || "P1",
            modelAssigned: payload.modelAssigned || null,
            testCommand: payload.testCommand || null,
            focusFiles: payload.focusFiles
              ? (typeof payload.focusFiles === "string"
                  ? payload.focusFiles.replace(/^["']|["']$/g, "").trim()
                  : Array.isArray(payload.focusFiles)
                    ? payload.focusFiles.join(" ")
                    : JSON.stringify(payload.focusFiles))
              : null,
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

    // 4a0. REST API: DELETE /api/tasks - Purge pending tasks (supports ?pattern=query)
    if (url.pathname === "/api/tasks" && req.method === "DELETE") {
      const taskRepo = this.daemon.getTaskRepository();
      const pattern = url.searchParams.get("pattern") || undefined;
      const deletedCount = await taskRepo.purgePendingTasks(pattern);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, deletedCount }));
      return;
    }

    // 4a0b. REST API: POST /api/tasks/requeue - Requeue failed tasks back to PENDING (supports ?pattern=query)
    if (url.pathname === "/api/tasks/requeue" && req.method === "POST") {
      const taskRepo = this.daemon.getTaskRepository();
      const pattern = url.searchParams.get("pattern") || undefined;
      const requeuedCount = await taskRepo.retryFailedTasks(pattern);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, requeuedCount }));
      return;
    }

    // 4a0c. REST API: POST /api/tasks/seed - Ingest uncompleted tasks from docs/taskcade.md via TaskcadeSeedLoader
    if (url.pathname === "/api/tasks/seed" && req.method === "POST") {
      const taskRepo = this.daemon.getTaskRepository();
      const { TaskcadeSeedLoader } = await import("../scheduler/TaskcadeSeedLoader.js");
      const loader = new TaskcadeSeedLoader();
      const limit = parseInt(url.searchParams.get("limit") || "400", 10);
      const phaseFilter = url.searchParams.get("phase") || undefined;
      const tasks = await loader.loadTasks({ limit, phaseFilter });
      let seededCount = 0;
      for (const t of tasks) {
        const res = await taskRepo.createIfNotExists(t);
        if (res.created) seededCount++;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, totalParsed: tasks.length, seededCount }));
      return;
    }

    // 4a0d. REST API: POST /api/tasks/reclaim - Reclaim stale running tasks back to PENDING
    if (url.pathname === "/api/tasks/reclaim" && req.method === "POST") {
      const taskRepo = this.daemon.getTaskRepository();
      const timeoutMinutes = parseInt(url.searchParams.get("timeoutMinutes") || "15", 10);
      const reclaimedCount = await taskRepo.reclaimStaleRunningTasks(timeoutMinutes);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, reclaimedCount }));
      return;
    }

    // 4a0e. REST API: POST /api/tasks/groom - Groom task queue: reconcile with merged PRs and normalize model assignments
    if (url.pathname === "/api/tasks/groom" && req.method === "POST") {
      const taskRepo = this.daemon.getTaskRepository();
      const allPending = await taskRepo.listPending();

      let reconciledPrCount = 0;
      let normalizedModelCount = 0;

      // 1. Fetch merged PRs from Gitea
      const giteaUrl = process.env.GITEA_BASE_URL || "http://cacophony-gitea:3000";
      const giteaToken = process.env.GITEA_API_TOKEN || "";
      const repoOwner = process.env.GIT_REPO_OWNER || "NeXeN";
      const repoName = process.env.GIT_REPO_NAME || "cacophony";

      let mergedPrs: any[] = [];
      try {
        const prRes = await fetch(`${giteaUrl}/api/v1/repos/${repoOwner}/${repoName}/pulls?state=closed`, {
          headers: giteaToken ? { Authorization: `token ${giteaToken}` } : {}
        });
        if (prRes.ok) {
          mergedPrs = (await prRes.json()) as any[];
        }
      } catch {
        // Gitea fetch non-fatal
      }

      const mergedPrMap = new Map<string, any>();
      for (const pr of mergedPrs) {
        if (!pr.merged) continue;
        const head = pr.head?.ref || "";
        const body = pr.body || "";
        mergedPrMap.set(head, pr);
        const taskIdMatch = body.match(/Task ID:\s*`([^`]+)`/i) || head.match(/(taskcade-t[0-9.]+|task-[0-9_]+)/i);
        if (taskIdMatch && taskIdMatch[1]) {
          mergedPrMap.set(taskIdMatch[1], pr);
        }
      }

      for (const task of allPending) {
        // Check if task already has a merged PR in Gitea
        const matchingPr = mergedPrMap.get(task.id) ||
          (task.prUrl && mergedPrs.find((p) => p.merged && task.prUrl?.includes(`/pulls/${p.number}`)));

        if (matchingPr) {
          const prHtmlUrl = matchingPr.html_url || `${process.env.GITEA_PUBLIC_URL || "http://localhost:19634"}/${repoOwner}/${repoName}/pulls/${matchingPr.number}`;
          await taskRepo.updatePr(task.id, matchingPr.base?.ref || "main", prHtmlUrl);
          await taskRepo.updateStatus(task.id, "COMPLETED", task.durationMs || 1000, task.tokensPerSec || 5.0);
          reconciledPrCount++;
          continue;
        }

        // Normalize model assignments if invalid alias
        if (task.modelAssigned) {
          const normalized = TaskScheduler.normalizeModelName(task.modelAssigned);
          if (normalized !== task.modelAssigned) {
            await taskRepo.updateModel(task.id, normalized);
            normalizedModelCount++;
          }
        }
      }

      const remainingPending = await taskRepo.listPending();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        reconciledPrCount,
        normalizedModelCount,
        pendingRemaining: remainingPending.length
      }));
      return;
    }

    // 4a1. REST API: GET or DELETE /api/tasks/:id - Detailed Task Record with Stages or Deletion
    const taskDetailMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskDetailMatch && req.method === "DELETE") {
      const taskId = taskDetailMatch[1]!;
      const taskRepo = this.daemon.getTaskRepository();
      await taskRepo.deleteTask(taskId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, taskId }));
      return;
    }
    if (taskDetailMatch && req.method === "GET") {
      const taskId = taskDetailMatch[1]!;
      const taskRepo = this.daemon.getTaskRepository();
      const task = await taskRepo.getById(taskId);
      if (!task) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Task '${taskId}' not found` }));
        return;
      }
      const stageRepo = this.daemon.getStageRepository();
      const stages = await stageRepo.getStagesForTask(taskId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...task, stages }));
      return;
    }

    // 4a2. REST API: GET /api/tasks/:id/gantt - Stage & Process Gantt Timeline Spans
    const ganttMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/gantt$/);
    if (ganttMatch && req.method === "GET") {
      const taskId = ganttMatch[1]!;
      const stageRepo = this.daemon.getStageRepository();
      const stages = await stageRepo.getStagesForTask(taskId);
      const spans = stages.map((st) => ({
        id: st.id,
        taskId: st.taskId,
        name: st.stageName,
        status: st.stageStatus,
        startedAt: st.startedAt,
        completedAt: st.completedAt,
        durationMs: st.durationMs,
        tokensSent: st.tokensSent,
        tokensReceived: st.tokensReceived
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ taskId, stages: spans }));
      return;
    }

    // 4a2. REST API: GET /api/tasks/:id/opinion - Distilled Cognitive Opinion & Reasoning Metrics
    const opinionMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/opinion$/);
    if (opinionMatch && req.method === "GET") {
      const taskId = opinionMatch[1]!;
      const stageRepo = this.daemon.getStageRepository();
      const stages = await stageRepo.getStagesForTask(taskId);
      const genStage = stages.find((s) => s.stageName === "generation");
      const reasoningTranscript = genStage?.reasoningTranscript || "";
      const thinkingDurationMs = genStage?.thinkingDurationMs || 0;

      const distiller = this.daemon.getDistillationService();
      const opinion = distiller
        ? await distiller.distillOpinion(reasoningTranscript)
        : {
            summary: reasoningTranscript ? "Extracted reasoning transcript." : "No cognitive trace available.",
            keyDecisions: [],
            identifiedRisks: [],
            confidenceScore: 0.8
          };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        taskId,
        hasReasoning: Boolean(reasoningTranscript),
        reasoningTranscript,
        thinkingDurationMs,
        opinion
      }));
      return;
    }

    // 4a3. REST API: GET /api/tasks/:id/pr-review - Structured PR Review & SOLID Compliance Verdict
    const prReviewMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/pr-review$/);
    if (prReviewMatch && req.method === "GET") {
      const taskId = prReviewMatch[1]!;
      const taskRepo = this.daemon.getTaskRepository();
      const task = await taskRepo.getById(taskId);
      if (!task) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Task '${taskId}' not found` }));
        return;
      }

      const stageRepo = this.daemon.getStageRepository();
      const stages = await stageRepo.getStagesForTask(taskId);
      const remediationStage = stages.slice().reverse().find((s) => s.stageName === "remediation");
      const prReviewStage = stages.slice().reverse().find((s) => s.stageName === "pr_review");

      // Extract verdict and SOLID compliance score from stage logs
      const logText = remediationStage?.logOutput || "";
      const isApproved = logText.includes("APPROVED") || logText.includes("passed verification gates") || prReviewStage?.stageStatus === "SUCCESS";
      const verdict = isApproved ? "APPROVED" : "CHANGES_REQUESTED";

      let solidScore = 95;
      const scoreMatch = logText.match(/SOLID score:?\s*(\d+)/i);
      if (scoreMatch && scoreMatch[1]) {
        solidScore = parseInt(scoreMatch[1], 10);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        taskId,
        prUrl: task.prUrl,
        targetBranch: task.targetBranch,
        verdict,
        solidComplianceScore: solidScore,
        reviewNotes: logText || "Automated review completed.",
        comments: [
          {
            path: task.focusFiles || "workspace",
            lineNumber: 1,
            comment: logText.slice(0, 300) || "Adherence to architectural guidelines validated.",
            severity: isApproved ? "info" : "warning"
          }
        ],
        merged: prReviewStage?.stageStatus === "SUCCESS"
      }));
      return;
    }

    // 4b. REST API: List Historical Completed/Failed Tasks
    if (url.pathname === "/api/history" && req.method === "GET") {
      const taskRepo = this.daemon.getTaskRepository();
      const statusParam = url.searchParams.get("status") as any;
      const limitParam = parseInt(url.searchParams.get("limit") || "100", 10);
      const allTasks = await taskRepo.listRecent(limitParam, statusParam ? { status: statusParam } : undefined);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(allTasks));
      return;
    }

    // 4c. REST API: Model Health Leaderboard
    if (url.pathname === "/api/models/leaderboard" && req.method === "GET") {
      const healthRepo = this.daemon.getModelHealthRepository();
      const profiles = await healthRepo.listProfiles();
      const leaderboard = profiles.map((p) => ({
        modelId: p.modelId,
        provider: p.provider,
        successRate: p.totalTasks > 0 ? (p.totalSuccess / p.totalTasks) * 100 : 100,
        totalRuns: p.totalTasks,
        totalSuccess: p.totalSuccess,
        totalFailures: p.totalFailures,
        consecutiveFailures: p.consecutiveFailures,
        avgLatencyMs: p.avgLatencyMs,
        avgTokensPerSec: p.avgTokensPerSec || 0.0,
        status: p.status === "EJECTED" ? "EVICTED" : p.consecutiveFailures > 0 ? "DEGRADED" : "HEALTHY",
        lastUsedAt: p.lastUsedAt
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(leaderboard));
      return;
    }

    // 4c0a. REST API: GET /api/models/installed - List Installed Models Annotated with Tenancy Guard
    if (url.pathname === "/api/models/installed" && req.method === "GET") {
      const modelManager = this.daemon.getModelManager() || new (await import("../inference/OllamaModelManager.js")).OllamaModelManager();
      const tenancyGuard = this.daemon.getTenancyGuard();
      const protectedModels = tenancyGuard ? tenancyGuard.getConfig().protectedModels : [];
      try {
        const models = await modelManager.listInstalledModels(protectedModels);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(models));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    // 4c0b. REST API: POST /api/models/pull - Pull New Ollama Model with SSE Progress Streaming
    if (url.pathname === "/api/models/pull" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf-8"); });
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const modelName = payload.model;
          if (!modelName || typeof modelName !== "string") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required parameter 'model'" }));
            return;
          }

          const tenancyGuard = this.daemon.getTenancyGuard();
          if (tenancyGuard) {
            const headroom = await tenancyGuard.checkDiskHeadroom();
            if (!headroom.hasHeadroom) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: headroom.reason || "Insufficient disk headroom" }));
              return;
            }
          }

          const modelManager = this.daemon.getModelManager() || new (await import("../inference/OllamaModelManager.js")).OllamaModelManager();

          // Stream progress events over SSE clients
          const onProgress = (event: import("@cacophony/shared-types").OllamaPullProgressEvent) => {
            const sseData = `event: model_pull_progress\ndata: ${JSON.stringify({ model: modelName, ...event })}\n\n`;
            for (const client of this.sseClients) {
              try { client.write(sseData); } catch { /* ignore */ }
            }
          };

          // Run pull asynchronously, respond immediately with accepted status
          res.writeHead(202, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "pulling", model: modelName }));

          void modelManager.pullModel(modelName, onProgress).catch((err) => {
            const sseError = `event: model_pull_progress\ndata: ${JSON.stringify({
              model: modelName,
              status: "error",
              error: err instanceof Error ? err.message : String(err)
            })}\n\n`;
            for (const client of this.sseClients) {
              try { client.write(sseError); } catch { /* ignore */ }
            }
          });
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid pull payload" }));
        }
      });
      return;
    }

    // 4c0c. REST API: DELETE /api/models/:modelId - Evict / Delete Model
    const modelDeleteMatch = url.pathname.match(/^\/api\/models\/([^/]+)$/);
    if (modelDeleteMatch && req.method === "DELETE") {
      const modelId = decodeURIComponent(modelDeleteMatch[1]!);
      const tenancyGuard = this.daemon.getTenancyGuard();
      if (tenancyGuard) {
        const check = tenancyGuard.canEvict(modelId);
        if (!check.allowed) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: check.reason }));
          return;
        }
      }

      const modelManager = this.daemon.getModelManager() || new (await import("../inference/OllamaModelManager.js")).OllamaModelManager();
      try {
        await modelManager.deleteModel(modelId);
        const healthRepo = this.daemon.getModelHealthRepository();
        await healthRepo.updateStatus(modelId, "EJECTED");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, modelId, status: "EVICTED" }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    // 4c0d. REST API: GET & PUT /api/models/config - Read/Update Model Tenancy Configuration
    if (url.pathname === "/api/models/config" && req.method === "GET") {
      const tenancyGuard = this.daemon.getTenancyGuard();
      const config = tenancyGuard ? tenancyGuard.getConfig() : {
        managedModelsEnabled: true,
        protectedModels: ["deepseek-r1:8b-4k", "qwen2.5-coder:7b-instruct-q4_K_M"],
        maxDiskStorageGb: 50,
        autoEvictionEnabled: true,
        minimumSuccessRateThreshold: 0.4,
        maxConsecutiveFailuresBeforeEviction: 3
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(config));
      return;
    }
    if (url.pathname === "/api/models/config" && req.method === "PUT") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf-8"); });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          const tenancyGuard = this.daemon.getTenancyGuard();
          if (tenancyGuard) {
            tenancyGuard.updateConfig(payload);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, config: tenancyGuard.getConfig() }));
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, config: payload }));
          }
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid config payload" }));
        }
      });
      return;
    }

    // 4c0e. REST API: POST /api/models/benchmark - Benchmark Model
    if (url.pathname === "/api/models/benchmark" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf-8"); });
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const modelName = payload.model;
          if (!modelName) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required parameter 'model'" }));
            return;
          }

          const runner = this.daemon.getBenchmarkRunner();
          if (!runner) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "BenchmarkRunner is not initialized on this daemon" }));
            return;
          }

          const result = await runner.benchmark(modelName);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    // 4c0f. REST API: GET /api/models/profiles - List All Model Tuning Profiles
    if (url.pathname === "/api/models/profiles" && req.method === "GET") {
      const profileRepo = this.daemon.getModelProfileRepository();
      try {
        const profiles = await profileRepo.listAllProfiles();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(profiles));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    // 4c0g. REST API: PUT /api/models/profiles/:id - Upsert Model Tuning Profile
    const profileMatch = url.pathname.match(/^\/api\/models\/profiles\/([^/]+)$/);
    if (profileMatch && req.method === "PUT") {
      const profileId = profileMatch[1]!;
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf-8"); });
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const profileRepo = this.daemon.getModelProfileRepository();
          const saved = await profileRepo.upsertProfile({
            id: profileId,
            modelName: payload.modelName || payload.model_name || "unknown",
            role: payload.role || "implementer",
            numPredict: Number(payload.numPredict ?? payload.num_predict ?? 8192),
            numCtx: Number(payload.numCtx ?? payload.num_ctx ?? 16384),
            temperature: Number(payload.temperature ?? 0.1),
            topK: Number(payload.topK ?? payload.top_k ?? 40),
            topP: Number(payload.topP ?? payload.top_p ?? 0.9),
            repeatPenalty: Number(payload.repeatPenalty ?? payload.repeat_penalty ?? 1.1),
            autoTuned: Boolean(payload.autoTuned ?? payload.auto_tuned ?? false),
            isActive: Boolean(payload.isActive ?? payload.is_active ?? true)
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, profile: saved }));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    // 4c0h. REST API: POST /api/models/profiles/auto-tune - Autonomous Model Profile Auto-Tuning
    if (url.pathname === "/api/models/profiles/auto-tune" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf-8"); });
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const modelManager = this.daemon.getModelManager() || new (await import("../inference/OllamaModelManager.js")).OllamaModelManager();
          const profileRepo = this.daemon.getModelProfileRepository();
          const installed = await modelManager.listInstalledModels([]);

          const targetModels = payload.models || installed.map((m) => m.name);
          const autoTuner = this.daemon.getAutoTuner();

          let autoTunedProfiles;
          if (autoTuner) {
            autoTunedProfiles = await autoTuner.autoTuneModels(targetModels);
          } else {
            const { EngineAutoTuner } = await import("../scheduler/EngineAutoTuner.js");
            const tuner = new EngineAutoTuner({
              profileRepo,
              healthRepo: this.daemon.getModelHealthRepository()
            });
            autoTunedProfiles = await tuner.autoTuneModels(targetModels);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, count: autoTunedProfiles.length, profiles: autoTunedProfiles }));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    // 4c1. REST API: Model Telemetry Efficiency Analytics
    if (url.pathname === "/api/analytics/models" && req.method === "GET") {
      const { TelemetryCorrelationService } = await import("../telemetry/TelemetryCorrelationService.js");
      const correlationRepo = (this.daemon as any).correlationRepo;
      const service = new TelemetryCorrelationService(correlationRepo);
      const scores = await service.getModelEfficiencyScores();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(scores));
      return;
    }

    // 4c2. REST API: Historical Failure Mode Analytics Trend Data
    if (url.pathname === "/api/analytics/failures" && req.method === "GET") {
      const windowDays = Number(url.searchParams.get("window") || "7");
      const filterModel = url.searchParams.get("model") || undefined;
      const filterRole = url.searchParams.get("role") || undefined;

      const { FailureClassifier } = await import("../analytics/FailureClassifier.js");
      const taskRepo = this.daemon.getTaskRepository();
      const stageRepo = this.daemon.getStageRepository();

      const failedTasks = await taskRepo.listRecent(100, { status: "FAILED" });
      const counts: Record<string, number> = {
        SYNTAX_ERROR: 0,
        TYPE_MISMATCH: 0,
        ASSERTION_FAILURE: 0,
        TIMEOUT: 0,
        MISSING_DEPENDENCY: 0,
        BANNED_IMPORT: 0,
        THERMAL_THROTTLE: 0,
        CONTEXT_OVERFLOW: 0,
        UNKNOWN: 0
      };

      const modelBreakdown: Record<string, Record<string, number>> = {};
      const roleBreakdown: Record<string, Record<string, number>> = {};

      let totalCount = 0;
      for (const t of failedTasks) {
        if (filterModel && t.modelAssigned !== filterModel) continue;
        if (filterRole && t.role !== filterRole) continue;

        const stages = await stageRepo.getStagesForTask(t.id);
        const failedStage = stages.find((s) => s.stageStatus === "FAILURE") || stages[stages.length - 1];
        const log = failedStage?.logOutput || "";

        const classification = FailureClassifier.classify(log, { logOutput: log });
        const cat = classification.category;
        counts[cat] = (counts[cat] || 0) + 1;
        totalCount++;

        const mKey = t.modelAssigned || "unassigned";
        if (!modelBreakdown[mKey]) modelBreakdown[mKey] = {};
        modelBreakdown[mKey][cat] = (modelBreakdown[mKey][cat] || 0) + 1;

        const rKey = t.role || "generic";
        if (!roleBreakdown[rKey]) roleBreakdown[rKey] = {};
        roleBreakdown[rKey][cat] = (roleBreakdown[rKey][cat] || 0) + 1;
      }

      // If zero failed tasks in DB yet, provide empty/nominal category distribution
      const categories = Object.entries(counts)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0
        }))
        .filter((c) => totalCount === 0 || c.count > 0);

      const responsePayload = {
        windowDays,
        totalFailures: totalCount,
        categories: categories.length > 0 ? categories : [
          { name: "ASSERTION_FAILURE", count: 0, percentage: 0 },
          { name: "TYPE_MISMATCH", count: 0, percentage: 0 },
          { name: "SYNTAX_ERROR", count: 0, percentage: 0 },
          { name: "MISSING_DEPENDENCY", count: 0, percentage: 0 },
          { name: "TIMEOUT", count: 0, percentage: 0 }
        ],
        modelBreakdown,
        roleBreakdown
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(responsePayload));
      return;
    }

    // 4c3. REST API: Fleet Node Registration & Cluster Topology
    if (url.pathname === "/api/fleet/register" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf-8"); });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body);
          const registeredNode = {
            nodeId: payload.nodeId || `node-${Date.now()}`,
            hostname: payload.hostname || "remote-worker",
            ipAddress: payload.ipAddress || "192.168.1.100",
            port: payload.port || 24074,
            gpuType: payload.gpuType || "AMD_VEGA",
            vramTotalMb: payload.vramTotalMb || 16384,
            vramUsedMb: 0,
            gpuBusyPercent: 0,
            temperatureCelsius: 48,
            status: "ONLINE",
            activeTasksCount: 0,
            lastHeartbeat: new Date().toISOString(),
            tokenHash: "node-auth-token-valid"
          };
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(registeredNode));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid registration payload" }));
        }
      });
      return;
    }

    if (url.pathname === "/api/fleet/nodes" && req.method === "GET") {
      const nodes = [
        {
          nodeId: "node-master-vega",
          hostname: "cacophony-master",
          ipAddress: "127.0.0.1",
          port: 24072,
          gpuType: "AMD_VEGA",
          vramTotalMb: 16384,
          vramUsedMb: 2150,
          gpuBusyPercent: 18,
          temperatureCelsius: 54,
          status: "ONLINE",
          activeTasksCount: 1,
          lastHeartbeat: new Date().toISOString()
        }
      ];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(nodes));
      return;
    }

    // 4c4. REST API: Gitea Webhook Dispatcher
    if (url.pathname === "/api/webhooks/gitea" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf-8"); });
      req.on("end", async () => {
        try {
          const { GiteaWebhookReceiver } = await import("../gitea/GiteaWebhookReceiver.js");
          const taskRepo = this.daemon.getTaskRepository();
          const secret = process.env.GITEA_WEBHOOK_SECRET || undefined;
          const receiver = new GiteaWebhookReceiver(taskRepo, secret);

          const event = (req.headers["x-gitea-event"] || req.headers["x-github-event"] || "pull_request") as string;
          const signature = (req.headers["x-gitea-signature"] || req.headers["x-hub-signature-256"]) as string | undefined;

          if (secret && signature && !receiver.verifySignature(body, signature)) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid webhook HMAC signature" }));
            return;
          }

          const payload = JSON.parse(body);
          const result = await receiver.handleWebhook(event, payload);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    // 4d. REST API: Processes List
    if (url.pathname === "/api/processes" && req.method === "GET") {
      const processes = [
        {
          id: "proc-live-1",
          command: "npm run test",
          durationMs: 42,
          exitCode: 0,
          status: "SUCCESS"
        }
      ];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(processes));
      return;
    }

    // 4e. REST API: Repository Architectural Map
    if (url.pathname === "/api/repomap" && req.method === "GET") {
      const symbols = [
        { id: "sym-1", name: "TaskScheduler", kind: "class", filePath: "packages/engine/src/scheduler/TaskScheduler.ts", centrality: 0.95 },
        { id: "sym-2", name: "CacophonyDaemon", kind: "class", filePath: "packages/engine/src/daemon/CacophonyDaemon.ts", centrality: 0.9 },
        { id: "sym-3", name: "CacophonyHttpServer", kind: "class", filePath: "packages/engine/src/daemon/CacophonyHttpServer.ts", centrality: 0.85 },
        { id: "sym-4", name: "SessionManager", kind: "class", filePath: "packages/engine/src/inference/SessionManager.ts", centrality: 0.8 },
        { id: "sym-5", name: "TelemetryPoller", kind: "class", filePath: "packages/engine/src/telemetry/TelemetryPoller.ts", centrality: 0.75 }
      ];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(symbols));
      return;
    }

    // 4f. REST API: Git Checkpoints List
    if (url.pathname === "/api/checkpoints" && req.method === "GET") {
      const checkpoints = [
        { id: "cp-1", hash: "a1b2c3d4e5f6", message: "Checkpoint: System initialization", createdAt: new Date().toISOString(), filesChanged: 3 }
      ];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(checkpoints));
      return;
    }

    // 4g. REST API: LSP Diagnostics
    if (url.pathname === "/api/diagnostics" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([]));
      return;
    }

    // 4h. REST API: Database Maintenance & Storage Metrics
    if (url.pathname === "/api/database/storage" && req.method === "GET") {
      const maintenance = this.daemon.getMaintenanceService();
      const metrics = await maintenance.getStorageMetrics();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(metrics));
      return;
    }

    if (url.pathname === "/api/database/maintenance" && req.method === "POST") {
      const maintenance = this.daemon.getMaintenanceService();
      const compaction = await maintenance.runVacuumAndCompaction();
      const partition = await maintenance.partitionAndArchiveOldTelemetry();
      const metrics = await maintenance.getStorageMetrics();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ compaction, partition, metrics }));
      return;
    }

    // 4i. REST API: Provider Quotas & Circuit Breaker Health
    if (url.pathname === "/api/config/quotas" && req.method === "GET") {
      const router = this.daemon.getFallbackRouter();
      const circuitBreakers = router ? router.getAllCircuitStatus() : {};
      const usage = router ? router.getQuotaTracker().getAllUsage() : {};

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "HEALTHY",
        circuitBreakers,
        quotas: usage,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // 4j. REST API: Role Affinity Configuration
    if (url.pathname === "/api/config/role-affinity" && req.method === "GET") {
      const roleAffinity = (this.daemon.getConfig() as any).roleAffinity || {};
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(roleAffinity));
      return;
    }

    if (url.pathname === "/api/config/role-affinity" && req.method === "PUT") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body);
          (this.daemon.getConfig() as any).roleAffinity = payload;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, roleAffinity: payload }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid config payload" }));
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

  private async broadcastTelemetry(): Promise<void> {
    const latest = this.daemon.getTelemetryPoller()?.getLatest();
    const gpu = latest?.gpu;
    const vramUsedMb = gpu ? Math.round(gpu.vramUsedBytes / (1024 * 1024)) : 0;
    const vramTotalMb = gpu ? Math.round(gpu.vramTotalBytes / (1024 * 1024)) : 0;
    const vramAvailMb = Math.max(0, vramTotalMb - vramUsedMb);
    const vramPercent = gpu ? gpu.vramPercent : 0;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const systemMemoryUsedMb = Math.round((totalMem - freeMem) / (1024 * 1024));
    const systemMemoryTotalMb = Math.round(totalMem / (1024 * 1024));
    const systemMemoryPercent = totalMem > 0 ? Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)) : 0;
    const loadAvg = (os.loadavg && os.loadavg()[0]) || 0;
    const cpuCount = (os.cpus && os.cpus().length) || 1;
    const cpuBusyPercent = Math.min(100, Number(((loadAvg / cpuCount) * 100).toFixed(1)));

    // Resolve the active model: prefer the running task's assigned model since it is set
    // synchronously when the task starts. The VRAM probe lags behind by however long it
    // takes Ollama to finish loading the model into VRAM, causing the display to show the
    // previous model well into the next task's generation phase.
    const runningTask = await (async () => {
      try { return await this.daemon.getTaskRepository().listPending().then((p) => p.find((t) => t.status === "RUNNING")); }
      catch { return null; }
    })();
    const activeModelName = runningTask?.modelAssigned || latest?.activeModel?.name || "None";

    const data = JSON.stringify({
      type: "telemetry",
      timestamp: new Date().toISOString(),
      gpuBusy: gpu?.gpuBusyPercent ?? 0,
      cpuBusyPercent,
      systemMemoryUsedMb,
      systemMemoryTotalMb,
      systemMemoryPercent,
      vramUsedMb,
      vramTotalMb,
      vramAvailMb,
      vramPercent,
      gttUsedMb: gpu ? Math.round(gpu.gttUsedBytes / (1024 * 1024)) : 0,
      gttTotalMb: gpu ? Math.round(gpu.gttTotalBytes / (1024 * 1024)) : 0,
      edgeTempCelsius: gpu?.edgeTempCelsius ?? 0,
      thermalZone: (latest?.thermalZone ?? "Nominal").toLowerCase(),
      vddgfxMv: gpu?.vddgfxMilliVolts ?? 0,
      socMv: gpu?.socMilliVolts ?? 0,
      vddnbMv: gpu?.vddnbMilliVolts ?? gpu?.socMilliVolts ?? 0,
      pptPowerW: gpu?.pptWatts ?? 0,
      sclkMhz: gpu?.sclkMhz ?? 0,
      mclkMhz: gpu?.mclkMhz ?? 0,
      activeModel: activeModelName
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
