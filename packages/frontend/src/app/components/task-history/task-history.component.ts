import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryMetricsService } from '../../services/history-metrics.service';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * Task History and Metrics component:
 * Displays filterable past runs, model health leaderboard, rolling success rates,
 * and direct clickable links to Gitea PRs, commit diffs, and issue tickets.
 */
@Component({
  selector: 'app-task-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-history.component.html',
  styleUrl: './task-history.component.css',
})
export class TaskHistoryComponent {
  private readonly metricsService = inject(HistoryMetricsService);
  private readonly store = inject(ArenaStateStore);
  public readonly historyItems = this.metricsService.historyItems;
  public readonly leaderboard = this.metricsService.leaderboard;
  public readonly successRate = this.metricsService.rollingSuccessRate;

  public readonly pageSize = 25;
  public readonly currentPage = signal<number>(1);

  public readonly totalPages = computed(() => {
    const count = this.historyItems().length;
    return Math.max(1, Math.ceil(count / this.pageSize));
  });

  public readonly paginatedHistoryItems = computed(() => {
    const list = this.historyItems();
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  public setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  public formatTks(val: number | null | undefined): string {
    return (Number(val) || 0).toFixed(1);
  }

  /**
   * Formats a millisecond duration into a human-readable string for the runtime column.
   * Renders as ms for sub-second runs, seconds for short runs, and m/s for long inference.
   */
  public formatDuration(ms: number | null | undefined): string {
    const v = Number(ms) || 0;
    if (v <= 0) return '--';
    if (v < 1000) return `${v}ms`;
    if (v < 60000) return `${(v / 1000).toFixed(1)}s`;
    const mins = Math.floor(v / 60000);
    const secs = Math.round((v % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  public formatTimestamp(isoStr: string | null | undefined): string {
    if (!isoStr || isoStr === 'Recently') return 'Recently';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const date = d.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return `${date} ${time}`;
    } catch {
      return isoStr;
    }
  }

  public drillDown(taskId: string): void {
    void this.store.selectTask(taskId);
  }
}
