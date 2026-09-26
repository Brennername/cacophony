import { Injectable, signal, computed } from '@angular/core';

export interface HistoryItem {
  id: string;
  title: string;
  status: 'PASSED' | 'FAILED' | 'REMEDIATED' | 'RUNNING' | 'PENDING';
  durationMs: number;
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

/**
 * Service managing historical task completions, model health leaderboards,
 * and direct links to Gitea PRs and commit diffs.
 */
@Injectable({
  providedIn: 'root',
})
export class HistoryMetricsService {
  public readonly historyItems = signal<HistoryItem[]>([]);
  public readonly leaderboard = signal<ModelLeaderboardEntry[]>([]);

  constructor() {
    this.fetchHistoryAndLeaderboard();
    if (typeof window !== 'undefined') {
      setInterval(() => {
        void this.fetchHistoryAndLeaderboard();
      }, 3000);
    }
  }

  public async fetchHistoryAndLeaderboard(): Promise<void> {
    try {
      const historyRes = await fetch('/api/history?limit=100');
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
          prUrl?: string | null;
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
            case 'RUNNING':
              return 'RUNNING';
            default:
              return 'PENDING';
          }
        };

        const items: HistoryItem[] = tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: mapStatus(t.status),
          durationMs: 3500,
          model: t.modelAssigned || 'Auto',
          role: t.role || 'implementer',
          priority: t.priority || 'P1',
          failureCount: t.failureCount || 0,
          prNumber: 1,
          prUrl: t.prUrl || 'http://localhost:19634/cacophony/core/pulls/1',
          commitDiffUrl: 'http://localhost:19634/cacophony/core/commit/main',
          timestamp: t.completedAt || 'Recently',
        }));
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
    const passed = finishedItems.filter((i) => i.status === 'PASSED' || i.status === 'REMEDIATED').length;
    return Math.round((passed / finishedItems.length) * 100);
  });
}
