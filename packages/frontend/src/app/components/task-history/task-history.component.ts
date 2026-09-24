import { Component, inject } from '@angular/core';
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
  template: `
    <div class="cacophony-card history-card">
      <div class="card-header">
        <div>
          <h2>Task History & Model Leaderboard</h2>
          <span class="subtext">Audited runs, failure taxonomy & direct Gitea links</span>
        </div>
        <div class="success-rate-gauge">
          <span class="rate-val">{{ successRate() }}%</span>
          <span class="rate-label">Success Rate</span>
        </div>
      </div>

      <!-- Model Leaderboard Row -->
      <div class="leaderboard-grid">
        @for (entry of leaderboard(); track entry.modelId) {
          <div class="leader-item">
            <div class="model-name">
              <span class="dot" [ngClass]="entry.status.toLowerCase()"></span>
              <strong>{{ entry.modelId }}</strong>
            </div>
            <div class="stats">
              <span>{{ entry.successRate }}% win</span>
              <span><span class="fixed-tks">{{ formatTks(entry.avgTokensPerSec) }}</span> tok/s</span>
            </div>
          </div>
        }
      </div>

      <!-- History Table -->
      <div class="table-container">
        <table class="history-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Task</th>
              <th>Model</th>
              <th>Gitea PR</th>
              <th>Commit Diff</th>
            </tr>
          </thead>
          <tbody>
            @for (item of historyItems(); track item.id) {
              <tr class="clickable-row" (click)="drillDown(item.id)">
                <td>
                  <span class="status-badge" [ngClass]="item.status.toLowerCase()">
                    {{ item.status }}
                  </span>
                </td>
                <td class="task-cell">
                  <div class="task-title-text">{{ item.title }} <span class="drill-tag">Details ↗</span></div>
                  @if (item.failureReason) {
                    <div class="failure-reason">{{ item.failureReason }}</div>
                  }
                </td>
                <td class="model-cell">{{ item.model }}</td>
                <td class="link-cell">
                  <a [href]="item.prUrl" target="_blank" rel="noopener" class="gitea-link">
                    PR #{{ item.prNumber }}
                  </a>
                </td>
                <td class="link-cell">
                  <a [href]="item.commitDiffUrl" target="_blank" rel="noopener" class="gitea-link font-mono">
                    View Diff
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .history-card {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .subtext {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .success-rate-gauge {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .rate-val {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--status-nominal);
    }

    .rate-label {
      font-size: 0.6875rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .leaderboard-grid {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 0.625rem;
    }

    @media (min-width: 640px) {
      .leaderboard-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .leader-item {
      padding: 0.625rem 0.75rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .model-name {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
    }

    .model-name .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .model-name .dot.healthy { background: var(--status-nominal); }
    .model-name .dot.degraded { background: var(--status-warm); }
    .model-name .dot.evicted { background: var(--status-danger); }

    .leader-item .stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
      white-space: nowrap;
    }

    .fixed-tks {
      display: inline-block;
      min-width: 5ch;
      width: 5ch;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
    }

    .table-container {
      overflow-x: auto;
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .history-table th {
      text-align: left;
      padding: 0.5rem 0.75rem;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .history-table td {
      padding: 0.625rem 0.75rem;
      border-bottom: 1px solid var(--border-subtle);
    }

    .status-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-full);
      text-transform: uppercase;
    }
    .status-badge.passed { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .status-badge.remediated { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .status-badge.failed { background: rgba(239, 68, 68, 0.2); color: #f87171; }

    .task-title-text {
      font-weight: 500;
      color: var(--text-primary);
    }

    .failure-reason {
      font-size: 0.6875rem;
      color: var(--status-warm);
      margin-top: 0.15rem;
    }

    .clickable-row {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .clickable-row:hover {
      background: var(--bg-surface-elevated);
    }

    .drill-tag {
      font-size: 0.6875rem;
      color: var(--color-brand);
      margin-left: 0.5rem;
      font-weight: 600;
    }

    .model-cell {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .gitea-link {
      color: var(--color-brand);
      text-decoration: none;
      font-weight: 500;
    }

    .gitea-link:hover {
      text-decoration: underline;
    }
  `],
})
export class TaskHistoryComponent {
  private readonly metricsService = inject(HistoryMetricsService);
  private readonly store = inject(ArenaStateStore);
  public readonly historyItems = this.metricsService.historyItems;
  public readonly leaderboard = this.metricsService.leaderboard;
  public readonly successRate = this.metricsService.rollingSuccessRate;

  public formatTks(val: number | null | undefined): string {
    return (Number(val) || 0).toFixed(1);
  }

  public drillDown(taskId: string): void {
    void this.store.selectTask(taskId);
  }
}
