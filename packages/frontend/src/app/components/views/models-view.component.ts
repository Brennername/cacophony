import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryMetricsService } from '../../services/history-metrics.service';
import { ExplorationControlComponent } from '../exploration-control/exploration-control.component';

/**
 * Model Leaderboard & Health Analytics route view:
 * Real-time dynamic win rates, token generation throughput, fallback matrices,
 * and eviction status.
 */
@Component({
  selector: 'app-models-view',
  standalone: true,
  imports: [CommonModule, ExplorationControlComponent],
  template: `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Candidate Model Leaderboard & Health</h1>
          <p class="subtitle">Empirical win rates, tokens/second velocity, and eviction profiles</p>
        </div>
        <div class="header-stat">
          <span class="stat-num">{{ metricsService.rollingSuccessRate() }}%</span>
          <span class="stat-label">Overall Fleet Pass Rate</span>
        </div>
      </div>

      <app-exploration-control />

      <div class="models-grid">
        @for (entry of metricsService.leaderboard(); track entry.modelId) {
          <div class="cacophony-card model-card">
            <div class="model-top">
              <div class="model-badge">
                <span class="dot" [ngClass]="entry.status.toLowerCase()"></span>
                <span class="model-name">{{ entry.modelId }}</span>
              </div>
              <span class="status-tag" [ngClass]="entry.status.toLowerCase()">
                {{ entry.status }}
              </span>
            </div>

            <div class="metrics-row">
              <div class="metric-col">
                <span class="metric-label">Win Rate</span>
                <span class="metric-value win">{{ entry.successRate }}%</span>
              </div>
              <div class="metric-col">
                <span class="metric-label">Velocity</span>
                <span class="metric-value font-mono"><span class="fixed-tks">{{ formatTks(entry.avgTokensPerSec) }}</span> tok/s</span>
              </div>
              <div class="metric-col">
                <span class="metric-label">Total Runs</span>
                <span class="metric-value">{{ entry.totalRuns }}</span>
              </div>
            </div>

            <div class="bar-container">
              <div class="bar-fill" [style.width.%]="entry.successRate"></div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .view-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .view-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .header-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .stat-num {
      font-family: var(--font-mono);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--status-nominal);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .models-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    @media (min-width: 768px) {
      .models-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .models-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .model-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .model-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .model-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .dot.active, .dot.healthy { background: var(--status-nominal); }
    .dot.cooldown, .dot.degraded { background: var(--status-warm); }
    .dot.ejected, .dot.failed { background: var(--status-danger); }

    .model-name {
      font-weight: 600;
      font-size: 1rem;
      color: var(--text-primary);
    }

    .status-tag {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
      text-transform: uppercase;
    }
    .status-tag.active { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .status-tag.cooldown { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .status-tag.ejected { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

    .metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      background: var(--bg-surface-elevated);
      padding: 0.625rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }

    .metric-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .metric-label {
      font-size: 0.6875rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metric-value {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-top: 0.15rem;
    }

    .metric-value.win {
      color: var(--color-brand);
    }

    .fixed-tks {
      display: inline-block;
      min-width: 5ch;
      width: 5ch;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
    }

    .bar-container {
      height: 6px;
      background: var(--bg-surface-elevated);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: var(--color-brand);
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }
  `],
})
export class ModelsViewComponent {
  public readonly metricsService = inject(HistoryMetricsService);

  public formatTks(val: number | null | undefined): string {
    return (Number(val) || 0).toFixed(1);
  }
}
