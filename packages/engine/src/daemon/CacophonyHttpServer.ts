import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { CacophonyDaemon } from "./CacophonyDaemon.js";
import { AuthService } from "../auth/AuthService.js";
import { RateLimiter } from "./RateLimiter.js";

export interface UnifiedServerConfig {
  readonly httpPort?: number;
  readonly httpHost?: string;
  readonly frontendDistPath?: string;
}

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

    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || "http";
    const forwardedHost = (req.headers["x-forwarded-host"] as string) || req.headers.host || "localhost:24161";
    const clientOrigin = `${forwardedProto}://${forwardedHost}`;
    const url = new URL(req.url ?? "/", clientOrigin);

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

    const requestOrigin = (req.headers.origin as string) || "*";
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

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

    if (url.pathname === "/api/events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });

      const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const streamTap = this.daemon.getStreamTapManager();
      if (streamTap) {
        const listener = (event: any) => {
          sendEvent(event);
        };
        streamTap.tap(listener);

        req.on("close", () => {
          streamTap.removeListener(listener);
        });
      }
    }

    if (url.pathname === "/api/config/role-affinity" && req.method === "GET") {
      const roleAffinity = this.daemon.getConfig().roleAffinity;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(roleAffinity));
    }

    if (url.pathname === "/api/config/role-affinity" && req.method === "PUT") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString("utf-8"); });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          this.daemon.getConfig().roleAffinity = payload;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, roleAffinity: payload }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid config payload" }));
        }
      });
    }

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