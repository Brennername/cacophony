import type { InferenceProviderType } from "@cacophony/shared-types";

/**
 * State of a CircuitBreaker for an external provider.
 */
export type CircuitState = "CLOSED" | "HALF_OPEN" | "OPEN";

/**
 * Configuration options for ProviderCircuitBreaker.
 */
export interface CircuitBreakerConfig {
  readonly failureThreshold?: number;   // Consecutive errors before tripping OPEN (default 3)
  readonly cooldownMs?: number;          // Wait time before transitioning to HALF_OPEN (default 30000ms)
}

/**
 * ProviderCircuitBreaker
 *
 * Implements the Circuit Breaker pattern for external inference providers:
 * - CLOSED: Normal operational state. Requests flow freely.
 * - OPEN: Tripped after repeated 429 rate-limits or 5xx server errors. Short-circuits calls to fallback.
 * - HALF_OPEN: Cooldown elapsed; allows a trial probe request to test provider recovery.
 */
export class ProviderCircuitBreaker {
  private state: CircuitState = "CLOSED";
  private consecutiveFailures = 0;
  private lastStateChangeTimestamp: number = Date.now();
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold ?? 3;
    this.cooldownMs = config.cooldownMs ?? 30000;
  }

  public getState(): CircuitState {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastStateChangeTimestamp;
      if (elapsed >= this.cooldownMs) {
        this.state = "HALF_OPEN";
        this.lastStateChangeTimestamp = Date.now();
      }
    }
    return this.state;
  }

  public canExecute(): boolean {
    const currentState = this.getState();
    return currentState === "CLOSED" || currentState === "HALF_OPEN";
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "CLOSED";
    this.lastStateChangeTimestamp = Date.now();
  }

  public recordFailure(isFatalOrRateLimit: boolean): void {
    if (!isFatalOrRateLimit) {
      return;
    }

    this.consecutiveFailures++;

    if (this.consecutiveFailures >= this.failureThreshold || this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.lastStateChangeTimestamp = Date.now();
    }
  }

  public reset(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.lastStateChangeTimestamp = Date.now();
  }

  public getSnapshot(): {
    readonly state: CircuitState;
    readonly consecutiveFailures: number;
    readonly failureThreshold: number;
    readonly lastStateChange: string;
  } {
    return {
      state: this.getState(),
      consecutiveFailures: this.consecutiveFailures,
      failureThreshold: this.failureThreshold,
      lastStateChange: new Date(this.lastStateChangeTimestamp).toISOString()
    };
  }
}

/**
 * TokenQuotaTracker
 *
 * Tracks daily and monthly token consumption and computes estimated USD cost
 * across external providers (OpenAI, Anthropic, Gemini).
 */
export class TokenQuotaTracker {
  private readonly consumption = new Map<string, {
    tokensPrompt: number;
    tokensCompletion: number;
    totalTokens: number;
    requestCount: number;
    estimatedCostUsd: number;
  }>();

  // Reference cost per 1M tokens in USD ($)
  private readonly pricingPerMillion: Record<string, { prompt: number; completion: number }> = {
    openai: { prompt: 2.50, completion: 10.00 },     // e.g. gpt-4o
    anthropic: { prompt: 3.00, completion: 15.00 },  // e.g. claude-3-5-sonnet
    gemini: { prompt: 1.25, completion: 5.00 },      // e.g. gemini-1.5-pro
    ollama: { prompt: 0.00, completion: 0.00 }       // local hardware execution
  };

  public recordUsage(
    provider: InferenceProviderType | string,
    tokensPrompt: number,
    tokensCompletion: number
  ): void {
    const key = provider.toLowerCase();
    const existing = this.consumption.get(key) ?? {
      tokensPrompt: 0,
      tokensCompletion: 0,
      totalTokens: 0,
      requestCount: 0,
      estimatedCostUsd: 0.0
    };

    const rates = this.pricingPerMillion[key] ?? { prompt: 1.0, completion: 2.0 };
    const costPrompt = (tokensPrompt / 1_000_000) * rates.prompt;
    const costComp = (tokensCompletion / 1_000_000) * rates.completion;
    const totalCost = Number((existing.estimatedCostUsd + costPrompt + costComp).toFixed(6));

    this.consumption.set(key, {
      tokensPrompt: existing.tokensPrompt + tokensPrompt,
      tokensCompletion: existing.tokensCompletion + tokensCompletion,
      totalTokens: existing.totalTokens + tokensPrompt + tokensCompletion,
      requestCount: existing.requestCount + 1,
      estimatedCostUsd: totalCost
    });
  }

  public getUsage(provider: string) {
    return this.consumption.get(provider.toLowerCase()) ?? {
      tokensPrompt: 0,
      tokensCompletion: 0,
      totalTokens: 0,
      requestCount: 0,
      estimatedCostUsd: 0.0
    };
  }

  public getAllUsage(): Record<string, ReturnType<typeof this.getUsage>> {
    const record: Record<string, ReturnType<typeof this.getUsage>> = {};
    for (const [k, v] of this.consumption.entries()) {
      record[k] = { ...v };
    }
    return record;
  }
}
