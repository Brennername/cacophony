import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HardwareMonitorComponent } from '../hardware-monitor/hardware-monitor.component';
import { TaskInspectorComponent } from '../task-inspector/task-inspector.component';
import { QueueManagerComponent } from '../queue-manager/queue-manager.component';
import { SuccessMeterComponent } from '../success-meter/success-meter.component';
import { ArenaStateStore } from '../../services/arena-state.store';
import { HistoryMetricsService } from '../../services/history-metrics.service';

/**
 * Dashboard Overview route view:
 * Displays execution reliability KPI banner, hardware diagnostics, active task inspector,
 * and compact queue snapshot in a balanced 2-column mobile-first grid.
 * Supports direct task bookmarking via /tasks/:id routing.
 */
@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    HardwareMonitorComponent,
    TaskInspectorComponent,
    QueueManagerComponent,
    SuccessMeterComponent,
  ],
  template: `
    <div class="dashboard-grid">
      <!-- Arena Execution Reliability & Success Meter KPI Strip (Full Width Above) -->
      <section class="grid-card-wrapper full-width">
        <div class="cacophony-card success-banner-card">
          <div class="banner-inner">
            <div class="meter-col">
              <app-success-meter [successPercentage]="rollingSuccessRate()" />
            </div>
            <div class="summary-col">
              <div class="summary-header">
                <div class="title-cluster">
                  <h3 class="banner-title">Arena Execution Reliability</h3>
                  <span class="reliability-badge" [ngClass]="reliabilityStatusClass()">
                    {{ reliabilityStatus() }}
                  </span>
                </div>
                <div class="arena-state-indicator">
                  <span class="status-dot"></span>
                  <span class="state-label">Scheduler {{ store.schedulerPaused() ? 'PAUSED' : 'ACTIVE' }}</span>
                </div>
              </div>
              <p class="summary-subtitle">
                Rolling execution pass rate across autonomous model fleet generations and automated remediation runs
              </p>
              <div class="kpi-pills-row">
                <div class="kpi-pill">
                  <span class="kpi-label">Pass Rate</span>
                  <span class="kpi-val highlight">{{ rollingSuccessRate() }}%</span>
                </div>
                <div class="kpi-pill">
                  <span class="kpi-label">Concluded Runs</span>
                  <span class="kpi-val">{{ totalConcluded() }}</span>
                </div>
                <div class="kpi-pill">
                  <span class="kpi-label">Passed / Remediated</span>
                  <span class="kpi-val nominal">{{ totalPassed() }}</span>
                </div>
                <div class="kpi-pill">
                  <span class="kpi-label">Failed / Timed Out</span>
                  <span class="kpi-val danger">{{ totalFailed() }}</span>
                </div>
                <div class="kpi-pill">
                  <span class="kpi-label">Queue Depth</span>
                  <span class="kpi-val">{{ store.pendingCount() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Hardware Telemetry Diagnostics (North-to-South Stacked) -->
      <section class="grid-card-wrapper full-width">
        <app-hardware-monitor />
      </section>

      <!-- Active Running Task Stepper & Log Stream (North-to-South Stacked) -->
      <section class="grid-card-wrapper full-width">
        <app-task-inspector />
      </section>

      <!-- Compact Queue Snapshot (Full Width Below) -->
      <section class="grid-card-wrapper full-width">
        <app-queue-manager />
      </section>
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

    .dashboard-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      grid-auto-flow: dense;
      gap: 1.25rem;
      align-items: stretch;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
    }

    @media (min-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .full-width {
        grid-column: span 2;
      }
    }

    .grid-card-wrapper {
      display: flex;
      flex-direction: column;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    .grid-card-wrapper > * {
      flex: 1;
      height: 100%;
      min-width: 0;
      max-width: 100%;
    }

    .success-banner-card {
      background: var(--bg-surface, #161d2f);
      border: 1px solid var(--border-subtle, #242f4c);
      border-radius: var(--radius-md, 10px);
      padding: 1rem 1.25rem;
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.4));
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    .banner-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      min-width: 0;
      width: 100%;
    }

    @media (min-width: 768px) {
      .banner-inner {
        flex-direction: row;
        align-items: center;
      }
    }

    .meter-col {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .summary-col {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      flex: 1;
      min-width: 0;
      width: 100%;
    }

    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .title-cluster {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .banner-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary, #f0f4fc);
      letter-spacing: -0.01em;
    }

    .reliability-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-sm, 6px);
    }

    .status-optimal {
      background: rgba(16, 185, 129, 0.15);
      color: var(--status-nominal, #10b981);
      border: 1px solid rgba(16, 185, 129, 0.35);
    }

    .status-nominal {
      background: rgba(245, 158, 11, 0.15);
      color: var(--status-warm, #f59e0b);
      border: 1px solid rgba(245, 158, 11, 0.35);
    }

    .status-degraded {
      background: rgba(239, 68, 68, 0.15);
      color: var(--status-danger, #ef4444);
      border: 1px solid rgba(239, 68, 68, 0.35);
    }

    .arena-state-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-secondary, #9ab0d3);
      padding: 0.2rem 0.5rem;
      background: var(--bg-surface-elevated, #1e273f);
      border: 1px solid var(--border-subtle, #242f4c);
      border-radius: var(--radius-sm, 6px);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--status-nominal, #10b981);
    }

    .summary-subtitle {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-muted, #5e7399);
      line-height: 1.35;
    }

    .kpi-pills-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .kpi-pill {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.35rem 0.65rem;
      background: var(--bg-secondary, #101522);
      border: 1px solid var(--border-subtle, #242f4c);
      border-radius: var(--radius-sm, 6px);
      min-width: 90px;
    }

    .kpi-label {
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted, #5e7399);
    }

    .kpi-val {
      font-family: var(--font-mono, monospace);
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary, #f0f4fc);
    }

    .kpi-val.highlight {
      color: var(--color-brand, #3b82f6);
    }

    .kpi-val.nominal {
      color: var(--status-nominal, #10b981);
    }

    .kpi-val.danger {
      color: var(--status-danger, #ef4444);
    }
  `],
})
export class DashboardViewComponent implements OnInit {
  public readonly store = inject(ArenaStateStore);
  public readonly metricsService = inject(HistoryMetricsService);
  private readonly route = inject(ActivatedRoute);

  public readonly rollingSuccessRate = this.metricsService.rollingSuccessRate;

  public readonly totalConcluded = computed<number>(() => {
    return this.metricsService.historyItems().filter(
      (i) => i.status === 'PASSED' || i.status === 'FAILED' || i.status === 'REMEDIATED'
    ).length;
  });

  public readonly totalPassed = computed<number>(() => {
    return this.metricsService.historyItems().filter(
      (i) => i.status === 'PASSED' || i.status === 'REMEDIATED'
    ).length;
  });

  public readonly totalFailed = computed<number>(() => {
    return this.metricsService.historyItems().filter(
      (i) => i.status === 'FAILED'
    ).length;
  });

  public readonly reliabilityStatus = computed<'OPTIMAL' | 'NOMINAL' | 'DEGRADED'>(() => {
    const rate = this.rollingSuccessRate();
    if (rate >= 90) return 'OPTIMAL';
    if (rate >= 70) return 'NOMINAL';
    return 'DEGRADED';
  });

  public readonly reliabilityStatusClass = computed<string>(() => {
    const rate = this.rollingSuccessRate();
    if (rate >= 90) return 'status-optimal';
    if (rate >= 70) return 'status-nominal';
    return 'status-degraded';
  });

  public ngOnInit(): void {
    const taskId = this.route.snapshot.paramMap.get('id');
    if (taskId) {
      void this.store.selectTask(taskId);
    }
  }
}