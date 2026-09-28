import type { IncomingMessage } from "node:http";

/**
 * Token-bucket rate limiter configuration.
 * Controls how many requests each client IP can make within a time window.
 */
export interface RateLimiterConfig {
  /** Maximum burst capacity -- how many tokens the bucket holds at full */
  readonly maxTokens: number;
  /** Tokens replenished per second (sustained throughput ceiling) */
  readonly refillRatePerSecond: number;
  /** Separate lower burst limit for mutating operations (POST/PUT/DELETE) */
  readonly maxMutatingTokens: number;
  /** Tokens replenished per second for mutating operations */
  readonly mutatingRefillRatePerSecond: number;
}

/**
 * Per-client bucket tracking current token count and last refill timestamp.
 * Two separate buckets per IP: one for reads, one for writes.
 */
interface ClientBucket {
  readTokens: number;
  mutatingTokens: number;
  lastRefillMs: number;
}

/** Default rate limiter configuration: generous for local/LAN use */
const DEFAULT_CONFIG: RateLimiterConfig = {
  maxTokens: 120,
  refillRatePerSecond: 20,
  maxMutatingTokens: 30,
  mutatingRefillRatePerSecond: 5
};

/**
 * In-memory token-bucket rate limiter for HTTP API protection.
 *
 * Uses a per-IP dual-bucket approach:
 * - Read bucket (GET, OPTIONS, HEAD): higher throughput for dashboard polling
 * - Mutating bucket (POST, PUT, DELETE): lower throughput to prevent queue flooding
 *
 * Buckets refill continuously based on elapsed time since last check (lazy refill).
 * Stale entries are periodically evicted to prevent unbounded memory growth.
 */
export class RateLimiter {
  private readonly config: RateLimiterConfig;
  private readonly buckets: Map<string, ClientBucket> = new Map();
  private evictionTimer: NodeJS.Timeout | null = null;

  /** Stale bucket entries older than 5 minutes are evicted to cap memory usage */
  private static readonly EVICTION_INTERVAL_MS = 60_000;
  private static readonly STALE_THRESHOLD_MS = 300_000;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Starts the periodic stale-entry eviction sweep.
   * Call once during server startup; pairs with stop() on shutdown.
   */
  public start(): void {
    if (this.evictionTimer) return;
    this.evictionTimer = setInterval(() => this.evictStaleEntries(), RateLimiter.EVICTION_INTERVAL_MS);
    // Avoid holding the event loop open for cleanup timers
    this.evictionTimer.unref();
  }

  /** Stops the eviction timer and clears all tracked buckets. */
  public stop(): void {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
      this.evictionTimer = null;
    }
    this.buckets.clear();
  }

  /**
   * Checks whether the given request should be allowed through.
   *
   * Returns true if a token was consumed (request allowed),
   * or false if the bucket is exhausted (request should be rate-limited).
   */
  public allowRequest(req: IncomingMessage): boolean {
    const clientIp = this.extractClientIp(req);
    const now = Date.now();
    const bucket = this.getOrCreateBucket(clientIp, now);

    // Refill tokens based on elapsed time since last check (lazy refill)
    this.refillBucket(bucket, now);

    const isMutating = this.isMutatingMethod(req.method || "GET");

    if (isMutating) {
      if (bucket.mutatingTokens < 1) return false;
      bucket.mutatingTokens -= 1;
    } else {
      if (bucket.readTokens < 1) return false;
      bucket.readTokens -= 1;
    }

    return true;
  }

  /**
   * Returns the number of seconds until the next token becomes available,
   * rounded up. Used in Retry-After response headers.
   */
  public getRetryAfterSeconds(req: IncomingMessage): number {
    const isMutating = this.isMutatingMethod(req.method || "GET");
    const refillRate = isMutating
      ? this.config.mutatingRefillRatePerSecond
      : this.config.refillRatePerSecond;

    // At minimum one refill cycle
    return Math.ceil(1 / refillRate);
  }

  /**
   * Extracts the client IP from the request, respecting X-Forwarded-For
   * when behind a reverse proxy, with fallback to socket remote address.
   */
  private extractClientIp(req: IncomingMessage): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      // X-Forwarded-For can be comma-separated; leftmost is the original client
      const firstIp = forwarded.split(",")[0]?.trim();
      if (firstIp) return firstIp;
    }
    return req.socket.remoteAddress || "unknown";
  }

  /** Retrieves existing bucket for the client IP or creates a fresh one at full capacity. */
  private getOrCreateBucket(clientIp: string, nowMs: number): ClientBucket {
    const existing = this.buckets.get(clientIp);
    if (existing) return existing;

    const fresh: ClientBucket = {
      readTokens: this.config.maxTokens,
      mutatingTokens: this.config.maxMutatingTokens,
      lastRefillMs: nowMs
    };
    this.buckets.set(clientIp, fresh);
    return fresh;
  }

  /**
   * Refills tokens based on elapsed time since last check.
   * Uses fractional token accumulation to maintain accurate sustained rates.
   */
  private refillBucket(bucket: ClientBucket, nowMs: number): void {
    const elapsedSeconds = (nowMs - bucket.lastRefillMs) / 1000;
    if (elapsedSeconds <= 0) return;

    bucket.readTokens = Math.min(
      this.config.maxTokens,
      bucket.readTokens + elapsedSeconds * this.config.refillRatePerSecond
    );

    bucket.mutatingTokens = Math.min(
      this.config.maxMutatingTokens,
      bucket.mutatingTokens + elapsedSeconds * this.config.mutatingRefillRatePerSecond
    );

    bucket.lastRefillMs = nowMs;
  }

  /** Determines whether the HTTP method is a state-mutating operation. */
  private isMutatingMethod(method: string): boolean {
    return method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH";
  }

  /** Evicts bucket entries that haven't been accessed within the stale threshold. */
  private evictStaleEntries(): void {
    const cutoff = Date.now() - RateLimiter.STALE_THRESHOLD_MS;
    for (const [ip, bucket] of this.buckets) {
      if (bucket.lastRefillMs < cutoff) {
        this.buckets.delete(ip);
      }
    }
  }
}
