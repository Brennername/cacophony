import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HardwareMonitorComponent } from '../../hardware-monitor/hardware-monitor.component';
import { TaskInspectorComponent } from '../../task-inspector/task-inspector.component';
import { SuccessMeterComponent } from '../../success-meter/success-meter.component';
import { WindowedSuccessTrendComponent } from '../../windowed-success-trend/windowed-success-trend.component';
import { ArenaStateStore, TaskItem } from '../../../services/arena-state.store';
import { HistoryMetricsService, HistoryItem } from '../../../services/history-metrics.service';
import { sanitizeGiteaUrl } from '../../../utils/url-normalizer';

/**
 * Dashboard Overview route view:
 * Displays execution reliability KPI banner, hardware diagnostics, active task inspector,
 * compact Task Queue snapshot (next 5 items with dynamic resizing stepper),
 * and compact Task History snapshot (last 5 items with dynamic resizing stepper).
 * Includes "All" buttons below each snapshot that navigate to the respective route,
 * activate the corresponding thumb bar button, and scroll to the route header.
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
  private readonly router = inject(Router);

  public readonly sanitizePrUrl = sanitizeGiteaUrl;

  public readonly rollingSuccessRate = this.metricsService.rollingSuccessRate;

  public readonly totalConcluded = this.metricsService.totalConcluded;
  public readonly totalPassed = this.metricsService.totalPassed;
  public readonly totalFailed = this.metricsService.totalFailed;

  /**
   * Dynamic entries shown sizing for Task Queue snapshot.
   * Defaults to next 5 items.
   */
  public readonly queueShownCount = signal<number>(5);

  /**
   * Dynamic entries shown sizing for Task History snapshot.
   * Defaults to last 5 items.
   */
  public readonly historyShownCount = signal<number>(5);

  /**
   * Slice of next queue items based on queueShownCount.
   */
  public readonly displayedQueueTasks = computed<TaskItem[]>(() => {
    return this.store.tasks().slice(0, this.queueShownCount());
  });

  /**
   * Slice of last concluded history items based on historyShownCount.
   */
  public readonly displayedHistoryItems = computed<HistoryItem[]>(() => {
    return this.metricsService.historyItems().slice(0, this.historyShownCount());
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

  public incrementQueueShown(): void {
    this.queueShownCount.update((count) => count + 1);
  }

  public decrementQueueShown(): void {
    this.queueShownCount.update((count) => Math.max(1, count - 1));
  }

  public incrementHistoryShown(): void {
    this.historyShownCount.update((count) => count + 1);
  }

  public decrementHistoryShown(): void {
    this.historyShownCount.update((count) => Math.max(1, count - 1));
  }

  public goToQueue(): void {
    void this.router.navigateByUrl('/queue').then(() => {
      this.scrollToTop();
    });
    this.scrollToTop();
  }

  public goToHistory(): void {
    void this.router.navigateByUrl('/history').then(() => {
      this.scrollToTop();
    });
    this.scrollToTop();
  }

  public drillDown(taskId: string): void {
    void this.store.selectTask(taskId);
  }

  public scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const main = document.querySelector('.main-content');
      if (main) {
        main.scrollTop = 0;
      }
      const layout = document.querySelector('.app-layout');
      if (layout) {
        layout.scrollTop = 0;
      }
      const header = document.querySelector('header.top-nav-header, .view-header, .dashboard-grid, main');
      if (header && typeof header.scrollIntoView === 'function') {
        header.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  public formatTks(val: number | null | undefined): string {
    return (Number(val) || 0).toFixed(1);
  }

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

  public formatCreatedTime(isoStr: string | null | undefined): string {
    if (!isoStr) return '--';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
      return isoStr;
    }
  }
}