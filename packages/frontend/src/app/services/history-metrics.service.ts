import { Injectable, signal, computed } from '@angular/core';

export interface HistoryItem {
  id: string;
  title: string;
  status: 'PASSED' | 'FAILED' | 'REMEDIATED';
  durationMs: number;
  model: string;
  prNumber: number;
  prUrl: string;
  commitDiffUrl: string;
  failureReason?: string;
  timestamp: string;
}

export interface ModelLeaderboardEntry {
  modelId: string;
  successRate: number;
  totalRuns: number;
  avgTokensPerSec: number;
  status: 'HEALTHY' | 'DEGRADED' | 'EVICTED';
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
      const historyRes = await fetch('/api/history');
      if (historyRes.ok) {
        const tasks = await historyRes.json() as Array<{ id: string; title: string; status: string; completedAt?: string; prUrl?: string }>;
        const items: HistoryItem[] = tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status === 'COMPLETED' ? 'PASSED' : t.status === 'FAILED' ? 'FAILED' : 'REMEDIATED',
          durationMs: 3500,
          model: 'qwen2.5-coder:7b',
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
    const passed = items.filter((i) => i.status === 'PASSED').length;
    return Math.round((passed / items.length) * 100);
  });
}
