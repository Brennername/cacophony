import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { CacophonyDaemon } from "./CacophonyDaemon.js";
import { AuthService } from "../auth/AuthService.js";

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

  constructor(daemon: CacophonyDaemon, config: UnifiedServerConfig = {}) {
    this.daemon = daemon;
    this.config = config;
    this.authService = new AuthService({
      userSessionRepo: daemon.getUserSessionRepository()
    });
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
      this.broadcastTelemetry();
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
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Dynamic Origin & Host Resolution
    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || "http";
    const forwardedHost = (req.headers["x-forwarded-host"] as string) || req.headers.host || "localhost:24161";
    const clientOrigin = `${forwardedProto}://${forwardedHost}`;
    const url = new URL(req.url ?? "/", clientOrigin);

    // Dynamic CORS & CSP headers
    const requestOrigin = (req.headers.origin as string) || "*";
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: http: https:;"
    );

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
        avgTokensPerSec: p.avgTokensPerSec || 35.0,
        status: p.status === "EJECTED" ? "EVICTED" : p.consecutiveFailures > 0 ? "DEGRADED" : "HEALTHY",
        lastUsedAt: p.lastUsedAt
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(leaderboard));
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
      activeModel: latest?.activeModel?.name ?? "None"
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
