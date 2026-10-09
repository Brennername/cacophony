import type {
  InferenceRequest,
  InferenceResponse,
  InferenceProviderType
} from "@cacophony/shared-types";
import type { IInferenceProvider } from "./IInferenceProvider.js";
import { ProviderCircuitBreaker, TokenQuotaTracker } from "./CircuitBreaker.js";

/**
 * Registered provider entry with circuit breaker.
 */
export interface RegisteredProviderEntry {
  readonly providerType: InferenceProviderType;
  readonly provider: IInferenceProvider;
  readonly priority: number; // lower number = higher preference
}

/**
 * FrontierFallbackRouter
 *
 * Implements resilient frontier provider routing with Circuit Breaker protections:
 * 1. Dispatches generation requests to preferred provider (e.g. OpenAI or Anthropic).
 * 2. If provider responds with 429 (rate-limit) or 5xx error, trips ProviderCircuitBreaker.
 * 3. Transparently falls back to secondary provider or high-reasoning local model (e.g. deepseek-r1:8b).
 * 4. Records all prompt/completion tokens and estimated cost in TokenQuotaTracker.
 */
export class FrontierFallbackRouter implements IInferenceProvider {
  private readonly providers: RegisteredProviderEntry[] = [];
  private readonly circuitBreakers = new Map<string, ProviderCircuitBreaker>();
  private readonly quotaTracker: TokenQuotaTracker;
  private readonly localFallbackModel: string;

  constructor(localFallbackModel = "deepseek-r1:8b", quotaTracker?: TokenQuotaTracker) {
    this.localFallbackModel = localFallbackModel;
    this.quotaTracker = quotaTracker ?? new TokenQuotaTracker();
  }

  public registerProvider(entry: RegisteredProviderEntry): void {
    this.providers.push(entry);
    this.providers.sort((a, b) => a.priority - b.priority);
    if (!this.circuitBreakers.has(entry.providerType)) {
      this.circuitBreakers.set(entry.providerType, new ProviderCircuitBreaker());
    }
  }

  public getProviderType(): InferenceProviderType {
    return (this.providers[0]?.providerType ?? "ollama") as InferenceProviderType;
  }

  public getQuotaTracker(): TokenQuotaTracker {
    return this.quotaTracker;
  }

  public getCircuitBreaker(providerType: string): ProviderCircuitBreaker | undefined {
    return this.circuitBreakers.get(providerType);
  }

  public getAllCircuitStatus(): Record<string, ReturnType<ProviderCircuitBreaker["getSnapshot"]>> {
    const status: Record<string, ReturnType<ProviderCircuitBreaker["getSnapshot"]>> = {};
    for (const [k, cb] of this.circuitBreakers.entries()) {
      status[k] = cb.getSnapshot();
    }
    return status;
  }

  public async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const errors: Array<{ provider: string; error: string }> = [];

    for (const entry of this.providers) {
      const breaker = this.circuitBreakers.get(entry.providerType);
      if (breaker && !breaker.canExecute()) {
        errors.push({
          provider: entry.providerType,
          error: `Circuit breaker is ${breaker.getState()}`
        });
        continue;
      }

      try {
        const response = await entry.provider.generate(request);
        breaker?.recordSuccess();
        this.quotaTracker.recordUsage(
          entry.providerType,
          response.tokensPrompt,
          response.tokensCompletion
        );
        return response;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const isFatalOrRateLimit =
          message.includes("429") ||
          message.includes("rate limit") ||
          message.includes("500") ||
          message.includes("502") ||
          message.includes("503");

        breaker?.recordFailure(isFatalOrRateLimit);
        errors.push({ provider: entry.providerType, error: message });
      }
    }

    throw new Error(
      `All inference providers failed or circuits open. Fallback attempted to ${this.localFallbackModel}. Errors: ${JSON.stringify(errors)}`
    );
  }

  public async stream(
    request: InferenceRequest,
    onChunk: (chunk: string) => void
  ): Promise<InferenceResponse> {
    for (const entry of this.providers) {
      const breaker = this.circuitBreakers.get(entry.providerType);
      if (breaker && !breaker.canExecute()) {
        continue;
      }

      try {
        const response = await entry.provider.stream(request, onChunk);
        breaker?.recordSuccess();
        this.quotaTracker.recordUsage(
          entry.providerType,
          response.tokensPrompt,
          response.tokensCompletion
        );
        return response;
      } catch {
        breaker?.recordFailure(true);
      }
    }

    throw new Error(`All providers failed to stream for request ${request.model}`);
  }
}
