import { Injectable, signal, computed } from '@angular/core';

export interface HistoryItem {
  id: string;
  title: string;
  status: 'PASSED' | 'FAILED' | 'REMEDIATED' | 'CANCELLED';
  durationMs: number;
  tokensPerSec: number;
  model: string;
  role?: string;
  priority?: string;
  failureCount?: number;
  prNumber: number;
  prUrl: string;
  commitDiffUrl: string;
  failureReason?: string;
  timestamp: string;
}

export interface ModelLeaderboardEntry {
  modelId: string;
  provider?: string;
  successRate: number;
  totalRuns: number;
  totalSuccess?: number;
  totalFailures?: number;
  consecutiveFailures?: number;
  avgLatencyMs?: number;
  avgTokensPerSec: number;
  status: 'HEALTHY' | 'DEGRADED' | 'EVICTED';
  lastUsedAt?: string | null;
}

export interface ArenaEpoch {
  epochId: number;
  name: string;
  reason: string;
  startedAt: string;
  endedAt?: string | null;
  isActive: boolean;
  taskCount?: number;
  successCount?: number;
  failureCount?: number;
  notes?: string;
}

/**
 * Service managing historical task completions, model health leaderboards,
 * arena telemetry epochs, and direct links to Gitea PRs and commit diffs.
 */
@Injectable({
  providedIn: 'root',
})
export class HistoryMetricsService {
  public readonly historyItems = signal<HistoryItem[]>([]);
  public readonly leaderboard = signal<ModelLeaderboardEntry[]>([]);
  public readonly currentEpoch = signal<ArenaEpoch | null>(null);
  public readonly epochs = signal<ArenaEpoch[]>([]);

  constructor() {
    this.fetchHistoryAndLeaderboard();
    this.fetchEpochs();
    if (typeof window !== 'undefined') {
      setInterval(() => {
        void this.fetchHistoryAndLeaderboard();
        void this.fetchEpochs();
      }, 3000);
    }
  }

  public async fetchEpochs(): Promise<void> {
    try {
      const res = await fetch('/api/arena/epochs');
      if (res.ok) {
        const data = (await res.json()) as { current: ArenaEpoch; epochs: ArenaEpoch[] };
        if (data.current) {
          this.currentEpoch.set(data.current);
        }
        if (data.epochs) {
          this.epochs.set(data.epochs);
        }
      }
    } catch {
      // offline
    }
  }

  public async advanceEpoch(name: string, reason: string, notes?: string): Promise<ArenaEpoch | null> {
    try {
      const res = await fetch('/api/models/epoch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, reason, notes }),
      });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; epoch: ArenaEpoch };
        await this.fetchEpochs();
        await this.fetchHistoryAndLeaderboard();
        return data.epoch;
      }
    } catch {
      // offline
    }
    return null;
  }

  public async resetStats(): Promise<boolean> {
    try {
      const res = await fetch('/api/models/reset-stats', {
        method: 'POST',
      });
      if (res.ok) {
        await this.fetchHistoryAndLeaderboard();
        return true;
      }
    } catch {
      // offline
    }
    return false;
  }

  public async fetchHistoryAndLeaderboard(): Promise<void> {
    try {
      const historyRes = await fetch('/api/history?limit=1000');
      if (historyRes.ok) {
        const tasks = (await historyRes.json()) as Array<{
          id: string;
          title: string;
          status: string;
          modelAssigned?: string | null;
          role?: string;
          priority?: string;
          failureCount?: number;
          completedAt?: string | null;
          createdAt?: string | null;
          prUrl?: string | null;
          durationMs?: number | null;
          tokensPerSec?: number | null;
        }>;
        const mapStatus = (rawStatus: string): HistoryItem['status'] => {
          switch (rawStatus) {
            case 'COMPLETED':
              return 'PASSED';
            case 'FAILED':
              return 'FAILED';
            case 'REMEDIATING':
            case 'REMEDIATED':
              return 'REMEDIATED';
            case 'CANCELLED':
            default:
              return 'CANCELLED';
          }
        };

        const items: HistoryItem[] = tasks.map((t) => {
          // Use stored duration_ms if present, otherwise fall back to epoch delta from timestamps
          const storedDuration = t.durationMs != null ? Number(t.durationMs) : null;
          const computedDuration =
            t.completedAt && t.createdAt
              ? Math.max(0, new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime())
              : 0;
          return {
            id: t.id,
            title: t.title,
            status: mapStatus(t.status),
            durationMs: storedDuration !== null ? storedDuration : computedDuration,
            tokensPerSec: t.tokensPerSec != null ? Number(t.tokensPerSec) : 0,
            model: t.modelAssigned || 'Auto',
            role: t.role || 'implementer',
            priority: t.priority || 'P1',
            failureCount: t.failureCount || 0,
            prNumber: t.prUrl ? (parseInt(t.prUrl.match(/\/pulls\/(\d+)/)?.[1] || '0', 10) || 0) : 0,
            prUrl: t.prUrl || '',
            commitDiffUrl: '',
            timestamp: t.completedAt || 'Recently',
          };
        });
        if (items.length > 0) {
          this.historyItems.set(items);
        }
      }
    } catch {
      // offline
    }

    try {
      const leaderRes = await fetch('/api/models/leaderboard');
      if (leaderRes.ok) {
        const leaderData = await leaderRes.json() as ModelLeaderboardEntry[];
        if (leaderData.length > 0) {
          this.leaderboard.set(leaderData);
        }
      }
    } catch {
      // offline
    }
  }

  public readonly rollingSuccessRate = computed(() => {
    const items = this.historyItems();
    if (items.length === 0) return 100;
    // Calculate success rate over concluded tasks (PASSED, FAILED, REMEDIATED)
    const finishedItems = items.filter(
      (i) => i.status === 'PASSED' || i.status === 'FAILED' || i.status === 'REMEDIATED'
    );
    if (finishedItems.length === 0) return 100;
    // Sliding window of the last 100 concluded runs
    const windowItems = finishedItems.slice(0, 100);
    const passed = windowItems.filter((i) => i.status === 'PASSED' || i.status === 'REMEDIATED').length;
    return Math.round((passed / windowItems.length) * 100);
  });

  /**
   * Resolves the historical lifetime average tokens/sec velocity for the specified model.
   */
  public getHistoricVelocityForModel(rawModelId: string): number {
    if (!rawModelId || rawModelId === 'None' || rawModelId === 'Auto') return 0;
    const cleanId = rawModelId.trim();
    const entry = this.leaderboard().find(
      (m) => m.modelId === cleanId || m.modelId.startsWith(cleanId) || cleanId.startsWith(m.modelId)
    );
    return entry?.avgTokensPerSec ?? 0;
  }
}
