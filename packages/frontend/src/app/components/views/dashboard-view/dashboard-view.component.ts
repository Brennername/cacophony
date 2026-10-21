import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HardwareMonitorComponent } from '../../hardware-monitor/hardware-monitor.component';
import { TaskInspectorComponent } from '../../task-inspector/task-inspector.component';
import { QueueManagerComponent } from '../../queue-manager/queue-manager.component';
import { SuccessMeterComponent } from '../../success-meter/success-meter.component';
import { WindowedSuccessTrendComponent } from '../../windowed-success-trend/windowed-success-trend.component';
import { ArenaStateStore } from '../../../services/arena-state.store';
import { HistoryMetricsService } from '../../../services/history-metrics.service';

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
    WindowedSuccessTrendComponent,
  ],
  templateUrl: './dashboard-view.component.html',
  styleUrl: './dashboard-view.component.css',
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