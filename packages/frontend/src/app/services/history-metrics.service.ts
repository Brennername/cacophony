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
  public readonly historyItems = signal<HistoryItem[]>([
    {
      id: 'task-089',
      title: 'Scaffold PGlite relational schema and migration runner',
      status: 'PASSED',
      durationMs: 4200,
      model: 'qwen2.5-coder:7b',
      prNumber: 4,
      prUrl: 'http://localhost:19634/cacophony/core/pulls/4',
      commitDiffUrl: 'http://localhost:19634/cacophony/core/commit/c4b8109',
      timestamp: '10 mins ago',
    },
    {
      id: 'task-088',
      title: 'Implement sysfs Vega APU hwmon sensor driver',
      status: 'PASSED',
      durationMs: 3800,
      model: 'qwen2.5-coder:7b',
      prNumber: 3,
      prUrl: 'http://localhost:19634/cacophony/core/pulls/3',
      commitDiffUrl: 'http://localhost:19634/cacophony/core/commit/9e8b2a1',
      timestamp: '25 mins ago',
    },
    {
      id: 'task-087',
      title: 'Add banned import scrubber rule with redis exemption',
      status: 'REMEDIATED',
      durationMs: 5100,
      model: 'mistral-nemo:12b',
      prNumber: 2,
      prUrl: 'http://localhost:19634/cacophony/core/pulls/2',
      commitDiffUrl: 'http://localhost:19634/cacophony/core/commit/1a2b3c4',
      failureReason: 'Initial AST syntax bracket unbalance healed in retry',
      timestamp: '1 hour ago',
    },
    {
      id: 'task-086',
      title: 'Unvalidated raw SQL injection vulnerability',
      status: 'FAILED',
      durationMs: 1200,
      model: 'deepseek-coder:6.7b',
      prNumber: 1,
      prUrl: 'http://localhost:19634/cacophony/core/pulls/1',
      commitDiffUrl: 'http://localhost:19634/cacophony/core/commit/00f91a7',
      failureReason: 'Execution guard rejected raw block query',
      timestamp: '2 hours ago',
    },
  ]);

  public readonly leaderboard = signal<ModelLeaderboardEntry[]>([
    {
      modelId: 'qwen2.5-coder:7b',
      successRate: 94.2,
      totalRuns: 52,
      avgTokensPerSec: 44.8,
      status: 'HEALTHY',
    },
    {
      modelId: 'mistral-nemo:12b',
      successRate: 88.5,
      totalRuns: 26,
      avgTokensPerSec: 29.1,
      status: 'HEALTHY',
    },
    {
      modelId: 'deepseek-coder:6.7b',
      successRate: 61.0,
      totalRuns: 18,
      avgTokensPerSec: 36.4,
      status: 'DEGRADED',
    },
  ]);

  public readonly rollingSuccessRate = computed(() => {
    const items = this.historyItems();
    if (items.length === 0) return 100;
    const passed = items.filter((i) => i.status === 'PASSED').length;
    return Math.round((passed / items.length) * 100);
  });
}
