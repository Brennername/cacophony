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
  template: `
    <div class="telemetry-bar-container" aria-label="System telemetry status bar">
      <!-- Success Rate Status Pill (T57.5.2) -->
      <div class="telemetry-pill success-pill" [ngClass]="statusColorClass()">
        <span class="pill-dot"></span>
        <span class="pill-label">Success</span>
        <span class="pill-value tabular">{{ rollingSuccessRate() }}%</span>
      </div>

      <!-- Active Model Pill -->
      <div class="telemetry-pill model-pill">
        <span class="pill-label">Model</span>
        <span class="pill-value truncate">{{ activeModel() }}</span>
      </div>

      <!-- Thermal & VRAM Indicators (hidden on ultra-compact mobile viewports) -->
      <div class="telemetry-pill hardware-pill hide-on-mobile">
        <span class="pill-label">GPU</span>
        <span class="pill-value tabular">{{ gpuBusy() }}% / {{ edgeTemp() }}C</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .telemetry-bar-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      padding: 0.35rem 0.5rem;
      background: var(--bg-surface-elevated, #18181b);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: var(--radius-md, 8px);
      font-family: var(--font-mono, monospace);
      font-size: 0.75rem;
    }

    .telemetry-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm, 4px);
      background: var(--bg-surface, #27272a);
      color: var(--text-secondary, #a1a1aa);
    }

    .pill-label {
      text-transform: uppercase;
      font-size: 0.65rem;
      letter-spacing: 0.05em;
      opacity: 0.8;
    }

    .pill-value {
      font-weight: 600;
      color: var(--text-primary, #ffffff);
    }

    .tabular {
      font-variant-numeric: tabular-nums;
    }

    .truncate {
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .success-pill.optimal {
      color: var(--status-nominal, #10b981);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .success-pill.warning {
      color: var(--status-warm, #f59e0b);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .success-pill.critical {
      color: var(--status-danger, #ef4444);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .hide-on-mobile {
      display: none;
    }

    @media (min-width: 640px) {
      .hide-on-mobile {
        display: inline-flex;
      }
    }
  `]
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
