import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoryMetricsService, type HistoryItem, type ModelLeaderboardEntry } from '../../services/history-metrics.service';
import { ArenaStateStore, type TaskItem } from '../../services/arena-state.store';
import { ExplorationControlComponent } from '../exploration-control/exploration-control.component';

/**
 * Model Leaderboard & Health Analytics route view:
 * Real-time dynamic win rates, token generation throughput, fallback matrices,
 * high-water mark velocity tracking, role/task distribution, and eviction profiles.
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
          <p class="subtitle">Empirical win rates, tokens/second velocity, and execution circumstances</p>
        </div>
        <div class="header-stats-group">
          <div class="header-stat">
            <span class="stat-num tabular">{{ metricsService.rollingSuccessRate() }}%</span>
            <span class="stat-label">Fleet Pass Rate</span>
          </div>
          <div class="header-stat">
            <span class="stat-num tabular">{{ metricsService.leaderboard().length }}</span>
            <span class="stat-label">Tracked Models</span>
          </div>
        </div>
      </div>

      <app-exploration-control />

      <!-- Deep Model Inspection Profile Panel when a Model is Selected -->
      @if (selectedModelId(); as modelId) {
        <div class="cacophony-card model-detail-panel">
          <div class="detail-header">
            <div class="detail-title-group">
              <span class="detail-badge font-mono">{{ modelId }}</span>
              <span class="status-tag" [ngClass]="(selectedModelEntry()?.status || 'HEALTHY').toLowerCase()">
                {{ selectedModelEntry()?.status || 'HEALTHY' }}
              </span>
              @if (selectedModelEntry()?.provider; as prov) {
                <span class="provider-pill">{{ prov }}</span>
              }
            </div>
            <button class="close-detail-btn" (click)="clearSelection()" title="Close model detail">
              ✕
            </button>
          </div>

          <div class="detail-metrics-grid">
            <!-- Win/Loss Breakdown -->
            <div class="metric-box">
              <span class="box-label">Success vs Failures</span>
              <div class="box-val-row">
                <span class="box-num text-success tabular">{{ selectedSuccessCount() }}</span>
                <span class="slash">/</span>
                <span class="box-num text-danger tabular">{{ selectedFailureCount() }}</span>
              </div>
              <span class="box-sub tabular">
                {{ selectedModelEntry()?.consecutiveFailures || 0 }} consecutive failures
              </span>
            </div>

            <!-- Win Rate -->
            <div class="metric-box">
              <span class="box-label">Empirical Win Rate</span>
              <span class="box-num text-brand tabular">{{ selectedWinRate() }}%</span>
              <div class="mini-bar">
                <div class="mini-bar-fill" [style.width.%]="selectedWinRate()"></div>
              </div>
            </div>

            <!-- Velocity & High Water Mark -->
            <div class="metric-box">
              <span class="box-label">Velocity / High-Water Mark</span>
              <div class="box-val-row">
                <span class="box-num tabular">{{ formatTks(selectedModelEntry()?.avgTokensPerSec) }}</span>
                <span class="unit">avg</span>
                <span class="slash">/</span>
                <span class="box-num text-hwm tabular">{{ formatTks(selectedModelHwm()) }}</span>
                <span class="unit">peak</span>
              </div>
              <span class="box-sub">Tokens per second</span>
            </div>

            <!-- Average Latency -->
            <div class="metric-box">
              <span class="box-label">Mean Latency</span>
              <span class="box-num tabular">{{ selectedLatency() }}ms</span>
              <span class="box-sub">Inference run duration</span>
            </div>
          </div>

          <!-- Circumstances & Distribution (Roles and Priorities) -->
          <div class="circumstances-row">
            <div class="sub-card">
              <h3>Task Types & Roles</h3>
              <div class="chips-container">
                @for (r of roleBreakdown(); track r.role) {
                  <div class="chip">
                    <span class="chip-name">{{ r.role }}</span>
                    <span class="chip-count font-mono tabular">{{ r.count }}</span>
                  </div>
                } @empty {
                  <span class="empty-subtext">No role assignments recorded yet</span>
                }
              </div>
            </div>

            <div class="sub-card">
              <h3>Priority Distribution</h3>
              <div class="chips-container">
                @for (p of priorityBreakdown(); track p.priority) {
                  <div class="chip priority" [class]="p.priority.toLowerCase()">
                    <span class="chip-name">{{ p.priority }}</span>
                    <span class="chip-count font-mono tabular">{{ p.count }}</span>
                  </div>
                } @empty {
                  <span class="empty-subtext">No priorities recorded yet</span>
                }
              </div>
            </div>
          </div>

          <!-- Historical Runs for This Model -->
          <div class="historical-runs-section">
            <div class="section-title-row">
              <h3>Execution History for {{ modelId }}</h3>
              <span class="subtext tabular">{{ selectedModelTasks().length }} total tasks executed</span>
            </div>

            <div class="runs-list">
              @for (task of paginatedModelTasks(); track task.id) {
                <div class="run-row" (click)="drillDownTask(task)">
                  <div class="run-left">
                    <span class="status-pill" [ngClass]="task.status.toLowerCase()">
                      {{ task.status }}
                    </span>
                    <span class="run-title">{{ task.title }}</span>
                  </div>

                  <div class="run-meta">
                    @if (task.role) {
                      <span class="meta-tag role">{{ task.role }}</span>
                    }
                    @if (task.priority) {
                      <span class="meta-tag priority">{{ task.priority }}</span>
                    }
                    <span class="meta-tag time font-mono tabular">{{ task.durationMs }}ms</span>
                    <button class="inspect-btn" title="Inspect task details">Details ↗</button>
                  </div>
                </div>
              } @empty {
                <div class="empty-runs">
                  <span>No completed tasks for this candidate yet. Active tasks are executing in the arena.</span>
                </div>
              }

              @if (totalModelTaskPages() > 1) {
                <div class="pagination-bar">
                  <button
                    class="page-btn"
                    [disabled]="modelTaskPage() === 1"
                    (click)="setModelTaskPage(modelTaskPage() - 1)"
                  >
                    Previous
                  </button>
                  <span class="page-info font-mono">
                    Page {{ modelTaskPage() }} of {{ totalModelTaskPages() }} ({{ selectedModelTasks().length }} tasks)
                  </span>
                  <button
                    class="page-btn"
                    [disabled]="modelTaskPage() === totalModelTaskPages()"
                    (click)="setModelTaskPage(modelTaskPage() + 1)"
                  >
                    Next
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Candidate Model Leaderboard Grid -->
      <div class="models-grid">
        @for (entry of metricsService.leaderboard(); track entry.modelId) {
          <div
            class="cacophony-card model-card clickable"
            [class.selected]="selectedModelId() === entry.modelId"
            (click)="selectModel(entry.modelId)"
            title="Click to view detailed statistics and task history"
          >
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
                <span class="metric-value win tabular">{{ entry.successRate }}%</span>
              </div>
              <div class="metric-col">
                <span class="metric-label">Velocity</span>
                <span class="metric-value font-mono">
                  <span class="fixed-tks tabular">{{ formatTks(entry.avgTokensPerSec) }}</span> tok/s
                </span>
              </div>
              <div class="metric-col">
                <span class="metric-label">Total Runs</span>
                <span class="metric-value tabular">{{ entry.totalRuns }}</span>
              </div>
            </div>

            <div class="bar-container">
              <div class="bar-fill" [style.width.%]="entry.successRate"></div>
            </div>

            <div class="card-footer-action">
              <span class="inspect-link">
                {{ selectedModelId() === entry.modelId ? 'Viewing Profile' : 'Inspect Profile ↗' }}
              </span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
    }

    .view-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
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
      margin: 0;
    }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .header-stats-group {
      display: flex;
      gap: 1.5rem;
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
      letter-spacing: 0.05em;
    }

    .tabular {
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
    }

    /* Selected Model Deep Profile Panel */
    .model-detail-panel {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.25rem;
      border: 1px solid var(--color-brand);
      background: var(--bg-surface-elevated);
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .detail-badge {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .provider-pill {
      font-size: 0.75rem;
      font-family: var(--font-mono);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      background: rgba(148, 163, 184, 0.15);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
    }

    .close-detail-btn {
      background: none;
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1rem;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-sm);
      transition: all 0.2s ease;
    }

    .close-detail-btn:hover {
      color: var(--text-primary);
      border-color: var(--text-muted);
    }

    .detail-metrics-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.75rem;
      min-width: 0;
      max-width: 100%;
    }

    @media (min-width: 640px) {
      .detail-metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .detail-metrics-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }

    .metric-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-height: 84px;
    }

    .box-label {
      font-size: 0.6875rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .box-val-row {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
    }

    .box-num {
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-mono);
    }

    .box-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .slash {
      font-size: 1rem;
      color: var(--border-strong);
    }

    .unit {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .text-success { color: #10b981; }
    .text-danger { color: #ef4444; }
    .text-brand { color: var(--color-brand); }
    .text-hwm { color: #06b6d4; font-weight: 700; }

    .mini-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 0.25rem;
    }

    .mini-bar-fill {
      height: 100%;
      background: var(--color-brand);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    /* Circumstances & Distribution */
    .circumstances-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1rem;
      min-width: 0;
      max-width: 100%;
    }

    @media (min-width: 768px) {
      .circumstances-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .sub-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .sub-card h3 {
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-secondary);
    }

    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.6rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
    }

    .chip-name {
      color: var(--text-secondary);
    }

    .chip-count {
      font-weight: 700;
      color: var(--color-brand);
    }

    .chip.priority.p0 .chip-count { color: #ef4444; }
    .chip.priority.p1 .chip-count { color: #f59e0b; }
    .chip.priority.p2 .chip-count { color: #10b981; }

    .empty-subtext {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-style: italic;
    }

    /* Historical Runs Section */
    .historical-runs-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-title-row h3 {
      font-size: 0.9375rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary);
    }

    .runs-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 320px;
      overflow-y: auto;
    }

    .run-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.625rem 0.875rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      cursor: pointer;
      gap: 0.75rem;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    .run-row:hover {
      border-color: var(--color-brand);
      background: var(--bg-surface-elevated);
    }

    .run-left {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex: 1;
      min-width: 0;
    }

    .run-title {
      font-size: 0.8125rem;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-pill {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.15rem 0.45rem;
      border-radius: 3px;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    .status-pill.passed { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .status-pill.failed { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .status-pill.remediated { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .status-pill.running { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .status-pill.pending { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }

    .run-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .meta-tag {
      font-size: 0.6875rem;
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
    }

    .meta-tag.priority {
      font-weight: 600;
      color: var(--text-secondary);
    }

    .inspect-btn {
      background: none;
      border: none;
      color: var(--color-brand);
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 600;
      padding: 0.2rem 0.4rem;
    }

    .empty-runs {
      padding: 1.5rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8125rem;
      background: var(--bg-surface);
      border: 1px dashed var(--border-subtle);
      border-radius: var(--radius-sm);
    }

    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0.25rem 0.25rem 0.25rem;
      border-top: 1px solid var(--border-subtle);
      margin-top: 0.5rem;
    }

    .page-btn {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      cursor: pointer;
      transition: border-color 0.15s ease, color 0.15s ease;
    }

    .page-btn:hover:not(:disabled) {
      border-color: var(--color-brand);
      color: var(--color-brand);
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Leaderboard Grid */
    .models-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1rem;
      min-width: 0;
      max-width: 100%;
    }

    @media (min-width: 768px) {
      .models-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .models-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    .model-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: border-color 0.2s ease, transform 0.15s ease;
    }

    .model-card.clickable {
      cursor: pointer;
    }

    .model-card.clickable:hover {
      border-color: var(--border-strong);
      transform: translateY(-2px);
    }

    .model-card.selected {
      border-color: var(--color-brand);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
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
    .dot.ejected, .dot.evicted, .dot.failed { background: var(--status-danger); }

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
    .status-tag.active, .status-tag.healthy { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .status-tag.cooldown, .status-tag.degraded { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .status-tag.ejected, .status-tag.evicted { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

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
      min-width: 5ch;
      width: 5ch;
    }

    .metric-value.win {
      color: var(--color-brand);
    }

    .fixed-tks {
      display: inline-block;
      min-width: 4.5ch;
      width: 4.5ch;
      text-align: right;
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

    .card-footer-action {
      display: flex;
      justify-content: flex-end;
      padding-top: 0.25rem;
    }

    .inspect-link {
      font-size: 0.75rem;
      color: var(--color-brand);
      font-weight: 600;
    }
  `],
})
export class ModelsViewComponent {
  public readonly route = inject(ActivatedRoute);
  public readonly router = inject(Router);
  public readonly store = inject(ArenaStateStore);
  public readonly metricsService = inject(HistoryMetricsService);

  public readonly selectedModelId = signal<string | null>(null);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const model = params.get('model');
      if (model) {
        this.selectedModelId.set(model);
      } else {
        const active = this.store.telemetry().activeModel;
        if (active && active !== 'None') {
          this.selectedModelId.set(active);
        }
      }
    });
  }

  public selectModel(modelId: string): void {
    if (this.selectedModelId() === modelId) {
      this.selectedModelId.set(null);
      void this.router.navigate([], { queryParams: { model: null }, queryParamsHandling: 'merge' });
    } else {
      this.selectedModelId.set(modelId);
      void this.router.navigate([], { queryParams: { model: modelId }, queryParamsHandling: 'merge' });
    }
  }

  public clearSelection(): void {
    this.selectedModelId.set(null);
    void this.router.navigate([], { queryParams: { model: null }, queryParamsHandling: 'merge' });
  }

  public readonly selectedModelEntry = computed<ModelLeaderboardEntry | null>(() => {
    const modelId = this.selectedModelId();
    if (!modelId) return null;
    return this.metricsService.leaderboard().find((m) => m.modelId === modelId) ?? null;
  });

  public readonly selectedModelTasks = computed<HistoryItem[]>(() => {
    const modelId = this.selectedModelId();
    if (!modelId) return [];
    return this.metricsService.historyItems().filter((h) => h.model === modelId);
  });

  public readonly modelTaskPageSize = 25;
  public readonly modelTaskPage = signal<number>(1);

  public readonly totalModelTaskPages = computed(() => {
    const count = this.selectedModelTasks().length;
    return Math.max(1, Math.ceil(count / this.modelTaskPageSize));
  });

  public readonly paginatedModelTasks = computed(() => {
    const tasks = this.selectedModelTasks();
    const page = Math.min(this.modelTaskPage(), this.totalModelTaskPages());
    const start = (page - 1) * this.modelTaskPageSize;
    return tasks.slice(start, start + this.modelTaskPageSize);
  });

  public setModelTaskPage(page: number): void {
    if (page >= 1 && page <= this.totalModelTaskPages()) {
      this.modelTaskPage.set(page);
    }
  }

  public readonly selectedSuccessCount = computed<number>(() => {
    const entry = this.selectedModelEntry();
    if (entry?.totalSuccess !== undefined) return entry.totalSuccess;
    return this.selectedModelTasks().filter((t) => t.status === 'PASSED').length;
  });

  public readonly selectedFailureCount = computed<number>(() => {
    const entry = this.selectedModelEntry();
    if (entry?.totalFailures !== undefined) return entry.totalFailures;
    return this.selectedModelTasks().filter((t) => t.status === 'FAILED').length;
  });

  public readonly selectedWinRate = computed<number>(() => {
    const entry = this.selectedModelEntry();
    if (entry?.successRate !== undefined) return Math.round(entry.successRate);
    const total = this.selectedModelTasks().length;
    if (total === 0) return 100;
    const passed = this.selectedSuccessCount();
    return Math.round((passed / total) * 100);
  });

  public readonly selectedLatency = computed<number>(() => {
    const entry = this.selectedModelEntry();
    if (entry?.avgLatencyMs !== undefined && entry.avgLatencyMs > 0) return Math.round(entry.avgLatencyMs);
    const tasks = this.selectedModelTasks();
    if (tasks.length === 0) return 2400;
    const sum = tasks.reduce((acc, t) => acc + (t.durationMs || 0), 0);
    return Math.round(sum / tasks.length);
  });

  public readonly selectedModelHwm = computed<number>(() => {
    const modelId = this.selectedModelId();
    if (!modelId) return 0;
    const recorded = this.store.modelHighWaterMarks()[modelId];
    if (recorded && recorded > 0) return recorded;
    const entry = this.selectedModelEntry();
    return entry ? entry.avgTokensPerSec * 1.3 : 35.0;
  });

  public readonly roleBreakdown = computed<Array<{ role: string; count: number }>>(() => {
    const tasks = this.selectedModelTasks();
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const r = t.role || 'implementer';
      counts[r] = (counts[r] || 0) + 1;
    }
    return Object.entries(counts).map(([role, count]) => ({ role, count }));
  });

  public readonly priorityBreakdown = computed<Array<{ priority: string; count: number }>>(() => {
    const tasks = this.selectedModelTasks();
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const p = t.priority || 'P1';
      counts[p] = (counts[p] || 0) + 1;
    }
    return Object.entries(counts).map(([priority, count]) => ({ priority, count }));
  });

  public drillDownTask(item: HistoryItem): void {
    const mapTaskStatus = (s: HistoryItem['status']): TaskItem['status'] => {
      switch (s) {
        case 'PASSED':
          return 'COMPLETED';
        case 'FAILED':
          return 'FAILED';
        case 'RUNNING':
          return 'RUNNING';
        case 'PENDING':
          return 'PENDING';
        case 'REMEDIATED':
        default:
          return 'REMEDIATED';
      }
    };

    const taskItem: TaskItem = {
      id: item.id,
      title: item.title,
      status: mapTaskStatus(item.status),
      priority: (item.priority as any) || 'P1',
      role: item.role || 'implementer',
      modelAssigned: item.model,
      prUrl: item.prUrl,
      logSnippet: item.failureReason ? `Failure Reason: ${item.failureReason}` : undefined,
    };
    void this.store.selectTask(taskItem);
  }

  public formatTks(val: number | null | undefined): string {
    return (Number(val) || 0).toFixed(1);
  }
}
