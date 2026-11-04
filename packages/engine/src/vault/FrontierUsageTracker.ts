import fs from "node:fs";
import path from "node:path";
import type {
  FrontierProviderType,
  FrontierUsageRecord,
  VaultUsageSummary,
  VaultLimitsConfig
} from "@cacophony/shared-types";

/**
 * Sliding window usage tracker and quota governor for frontier API invocations.
 * Monitors 5-hour rolling burst windows and 7-day budget ceilings.
 */
export class FrontierUsageTracker {
  private static instance: FrontierUsageTracker | null = null;
  private readonly storagePath: string;
  private records: FrontierUsageRecord[] = [];
  private limits: VaultLimitsConfig = {
    weeklyBudgetCeilingUsd: 15.0,
    fiveHourTokenLimit: 250000
  };

  constructor(storageDir?: string) {
    const baseDir = storageDir || process.env.DATA_DIR || process.env.DB_PATH || "./data";
    this.storagePath = path.join(baseDir, "frontier_usage.json");
    this.loadFromDisk();
  }

  public static getInstance(): FrontierUsageTracker {
    if (!FrontierUsageTracker.instance) {
      FrontierUsageTracker.instance = new FrontierUsageTracker();
    }
    return FrontierUsageTracker.instance;
  }

  /**
   * Records a single frontier model inference call.
   */
  public recordUsage(entry: {
    provider: FrontierProviderType;
    model: string;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd?: number;
  }): FrontierUsageRecord {
    const totalTokens = (entry.promptTokens || 0) + (entry.completionTokens || 0);
    // Estimated pricing baseline if not provided ($0.003 / 1k tokens blended)
    const cost = entry.estimatedCostUsd ?? (totalTokens / 1000) * 0.003;

    const record: FrontierUsageRecord = {
      id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      provider: entry.provider,
      model: entry.model,
      promptTokens: entry.promptTokens || 0,
      completionTokens: entry.completionTokens || 0,
      estimatedCostUsd: Number(cost.toFixed(5)),
      timestamp: new Date().toISOString()
    };

    this.records.push(record);
    this.pruneOldRecords();
    this.persistToDisk();

    return record;
  }

  /**
   * Computes rolling window summaries across all providers.
   */
  public getSummaries(): VaultUsageSummary[] {
    const now = Date.now();
    const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const providers: FrontierProviderType[] = [
      "anthropic",
      "openai",
      "deepseek",
      "gemini",
      "groq",
      "mistral",
      "custom"
    ];

    return providers.map((provider) => {
      const providerRecords = this.records.filter((r) => r.provider === provider);

      const fiveHourRecords = providerRecords.filter(
        (r) => new Date(r.timestamp).getTime() >= fiveHoursAgo
      );
      const sevenDayRecords = providerRecords.filter(
        (r) => new Date(r.timestamp).getTime() >= sevenDaysAgo
      );

      const fiveHourTokens = fiveHourRecords.reduce(
        (acc, r) => acc + r.promptTokens + r.completionTokens,
        0
      );
      const fiveHourCost = fiveHourRecords.reduce((acc, r) => acc + r.estimatedCostUsd, 0);

      const sevenDayTokens = sevenDayRecords.reduce(
        (acc, r) => acc + r.promptTokens + r.completionTokens,
        0
      );
      const sevenDayCost = sevenDayRecords.reduce((acc, r) => acc + r.estimatedCostUsd, 0);

      const fiveHourUsagePercent = Math.min(
        100,
        Math.round((fiveHourTokens / this.limits.fiveHourTokenLimit) * 100)
      );
      const weeklyUsagePercent = Math.min(
        100,
        Math.round((sevenDayCost / this.limits.weeklyBudgetCeilingUsd) * 100)
      );

      return {
        provider,
        fiveHourTokens,
        fiveHourRequests: fiveHourRecords.length,
        fiveHourCostUsd: Number(fiveHourCost.toFixed(4)),
        sevenDayTokens,
        sevenDayRequests: sevenDayRecords.length,
        sevenDayCostUsd: Number(sevenDayCost.toFixed(4)),
        weeklyCostLimitUsd: this.limits.weeklyBudgetCeilingUsd,
        fiveHourTokenLimit: this.limits.fiveHourTokenLimit,
        fiveHourUsagePercent,
        weeklyUsagePercent
      };
    });
  }

  /**
   * Evaluates whether a provider is currently rate-constrained or over budget.
   */
  public isRateConstrained(provider: FrontierProviderType): { constrained: boolean; reason?: string } {
    const summaries = this.getSummaries();
    const summary = summaries.find((s) => s.provider === provider);
    if (!summary) {
      return { constrained: false };
    }

    if (summary.weeklyUsagePercent >= 100) {
      return {
        constrained: true,
        reason: `Weekly budget limit of $${this.limits.weeklyBudgetCeilingUsd.toFixed(2)} reached (${summary.weeklyUsagePercent}%)`
      };
    }

    if (summary.fiveHourUsagePercent >= 90) {
      return {
        constrained: true,
        reason: `5-Hour burst limit of ${this.limits.fiveHourTokenLimit.toLocaleString()} tokens near capacity (${summary.fiveHourUsagePercent}%)`
      };
    }

    return { constrained: false };
  }

  /**
   * Updates budget and burst limit configuration.
   */
  public setLimits(newLimits: Partial<VaultLimitsConfig>): VaultLimitsConfig {
    this.limits = {
      weeklyBudgetCeilingUsd:
        newLimits.weeklyBudgetCeilingUsd !== undefined && newLimits.weeklyBudgetCeilingUsd > 0
          ? newLimits.weeklyBudgetCeilingUsd
          : this.limits.weeklyBudgetCeilingUsd,
      fiveHourTokenLimit:
        newLimits.fiveHourTokenLimit !== undefined && newLimits.fiveHourTokenLimit > 0
          ? newLimits.fiveHourTokenLimit
          : this.limits.fiveHourTokenLimit
    };
    this.persistToDisk();
    return { ...this.limits };
  }

  public getLimits(): VaultLimitsConfig {
    return { ...this.limits };
  }

  /**
   * Prunes records older than 14 days to preserve memory and disk space.
   */
  private pruneOldRecords(): void {
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    this.records = this.records.filter((r) => new Date(r.timestamp).getTime() >= fourteenDaysAgo);
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.records && Array.isArray(parsed.records)) {
          this.records = parsed.records;
        }
        if (parsed.limits) {
          this.limits = { ...this.limits, ...parsed.limits };
        }
      }
    } catch {
      // Fallback to empty usage state
    }
  }

  private persistToDisk(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.storagePath,
        JSON.stringify({ records: this.records.slice(-1000), limits: this.limits }, null, 2),
        { mode: 0o600 }
      );
    } catch {
      // Non-fatal disk write error
    }
  }
}
