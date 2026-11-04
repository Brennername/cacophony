import { Injectable, signal } from '@angular/core';
import type {
  FrontierProviderType,
  VaultKeyDescriptor,
  VaultUsageSummary,
  VaultLimitsConfig,
} from '@cacophony/shared-types';

/**
 * VaultService
 *
 * Client service interacting with engine /api/vault REST endpoints.
 * Handles encrypted credential storage, usage telemetry, and spending limits.
 */
@Injectable({
  providedIn: 'root',
})
export class VaultService {
  public readonly keys = signal<readonly VaultKeyDescriptor[]>([]);
  public readonly usageSummaries = signal<Readonly<Record<string, VaultUsageSummary>>>({});
  public readonly limits = signal<VaultLimitsConfig>({
    weeklyBudgetCeilingUsd: 15.0,
    fiveHourTokenLimit: 250000,
  });
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  constructor() {
    void this.fetchKeys();
    void this.fetchUsage();
  }

  /**
   * Refreshes the list of configured frontier API keys (masked previews only).
   */
  public async fetchKeys(): Promise<void> {
    try {
      const res = await fetch('/api/vault/keys');
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; keys: VaultKeyDescriptor[] };
        this.keys.set(data.keys || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(`Failed to fetch keys: ${msg}`);
    }
  }

  /**
   * Encrypts and saves an API key for a frontier provider.
   */
  public async saveKey(provider: FrontierProviderType, rawKey: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/vault/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, rawKey }),
      });
      if (res.ok) {
        await this.fetchKeys();
        return true;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      this.error.set(data.error || 'Failed to save credential');
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Revokes and removes an encrypted API key from the vault.
   */
  public async deleteKey(provider: FrontierProviderType): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`/api/vault/keys/${encodeURIComponent(provider)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await this.fetchKeys();
        return true;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      this.error.set(data.error || 'Failed to delete credential');
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Refreshes rolling 5-hour and 7-day usage telemetry.
   */
  public async fetchUsage(): Promise<void> {
    try {
      const res = await fetch('/api/vault/usage');
      if (res.ok) {
        const data = (await res.json()) as {
          success: boolean;
          summaries: VaultUsageSummary[] | Record<string, VaultUsageSummary>;
          limits: VaultLimitsConfig;
        };
        if (Array.isArray(data.summaries)) {
          const map: Record<string, VaultUsageSummary> = {};
          for (const s of data.summaries) {
            map[s.provider] = s;
          }
          const total5hTokens = data.summaries.reduce((a, b) => a + (b.fiveHourTokens || 0), 0);
          const total5hReqs = data.summaries.reduce((a, b) => a + (b.fiveHourRequests || 0), 0);
          const total5hCost = data.summaries.reduce((a, b) => a + (b.fiveHourCostUsd || 0), 0);
          const total7dTokens = data.summaries.reduce((a, b) => a + (b.sevenDayTokens || 0), 0);
          const total7dReqs = data.summaries.reduce((a, b) => a + (b.sevenDayRequests || 0), 0);
          const total7dCost = data.summaries.reduce((a, b) => a + (b.sevenDayCostUsd || 0), 0);
          const fiveHourLimit = data.limits?.fiveHourTokenLimit || 250000;
          const weeklyLimit = data.limits?.weeklyBudgetCeilingUsd || 15.0;

          map['GLOBAL'] = {
            provider: 'custom',
            fiveHourTokens: total5hTokens,
            fiveHourRequests: total5hReqs,
            fiveHourCostUsd: total5hCost,
            sevenDayTokens: total7dTokens,
            sevenDayRequests: total7dReqs,
            sevenDayCostUsd: total7dCost,
            fiveHourTokenLimit: fiveHourLimit,
            weeklyCostLimitUsd: weeklyLimit,
            fiveHourUsagePercent: fiveHourLimit > 0 ? Math.min(100, (total5hTokens / fiveHourLimit) * 100) : 0,
            weeklyUsagePercent: weeklyLimit > 0 ? Math.min(100, (total7dCost / weeklyLimit) * 100) : 0,
          };
          this.usageSummaries.set(map);
        } else {
          this.usageSummaries.set(data.summaries || {});
        }

        if (data.limits) {
          this.limits.set(data.limits);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(`Failed to fetch usage: ${msg}`);
    }
  }

  /**
   * Updates spending limits for 5-hour token bursts and weekly budget ceiling.
   */
  public async updateLimits(newLimits: Partial<VaultLimitsConfig>): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/vault/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLimits),
      });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; limits: VaultLimitsConfig };
        this.limits.set(data.limits);
        await this.fetchUsage();
        return true;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      this.error.set(data.error || 'Failed to update limits');
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Helper checking whether a key is configured for a provider.
   */
  public hasKey(provider: string): boolean {
    return this.keys().some((k) => k.provider === provider && k.isValid);
  }
}
