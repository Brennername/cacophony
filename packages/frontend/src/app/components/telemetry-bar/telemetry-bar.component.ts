import { Component, inject, computed } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { HistoryMetricsService } from '../../services/history-metrics.service';
import { ArenaStateStore } from '../../services/arena-state.store';

/**
 * TelemetryBarComponent
 *
 * Compact root telemetry strip visible across all routes (Phase 57: T57.5.2).
 * Integrates:
 * 1. Compact rolling success percentage pill with dynamic status color thresholds.
 * 2. Active model indicator and inference token velocity.
 * 3. Accelerator thermal sensor reading and GPU utilization.
 * Mobile-first responsive layout with dark/light theme support and zero emojis.
 */
@Component({
  selector: 'app-telemetry-bar',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './telemetry-bar.component.html',
  styleUrl: './telemetry-bar.component.css',
})
export class TelemetryBarComponent {
  private readonly metricsService = inject(HistoryMetricsService);
  private readonly store = inject(ArenaStateStore);

  public readonly rollingSuccessRate = this.metricsService.rollingSuccessRate;
  public readonly telemetry = this.store.telemetry;

  public readonly activeModel = computed(() => {
    return this.telemetry().activeModel || 'Idle';
  });

  public readonly gpuBusy = computed(() => {
    return this.telemetry().gpuBusyPercent ?? 0;
  });

  public readonly edgeTemp = computed(() => {
    return this.telemetry().edgeTempCelsius;
  });

  public readonly statusColorClass = computed(() => {
    const rate = this.rollingSuccessRate();
    if (rate >= 80) return 'optimal';
    if (rate >= 50) return 'warning';
    return 'critical';
  });
}
