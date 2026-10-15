import { Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ArenaStateStore } from '../../services/arena-state.store';
import { HistoryMetricsService } from '../../services/history-metrics.service';
import { TriMetricGaugeComponent } from '../tri-metric-gauge/tri-metric-gauge.component';
import { type TelemetryReferenceLine } from '../../utils/tri-metric-calculator';

/**
 * Modern System Diagnostics and Telemetry Monitor.
 * Features:
 * 1. Progress-bar APU Temperature monitor (105C = 100%, fencepost color gradients, normal degree display,
 *    and emergency queue cutoff threshold).
 * 2. Moving Area-of-Curve (AOC) sparkline line graphs under each primary telemetry card.
 * 3. High-water mark token velocity tracker with 2-sigma outlier filtering and shared tri-metric gauge.
 * 4. Deduplicated metrics: GPU Load, CPU Load, System RAM, VRAM, and GTT Memory with unified tri-metric tracks.
 * 5. Fixed bounding boxes with tabular numbers to prevent digit change flickering.
 * 6. Interactive click navigation to model statistics view.
 * 7. Real-time Processor SCLK MHz Tri-Metric Rolling Gauge with 200MHz yellow and 400MHz blue dotted reference lines.
 * 8. Live vs Historical Model Velocity Comparison with variance indicator.
 */
@Component({
  selector: 'app-hardware-monitor',
  standalone: true,
  imports: [CommonModule, TriMetricGaugeComponent],
  templateUrl: './hardware-monitor.component.html',
  styleUrl: './hardware-monitor.component.css',
})
export class HardwareMonitorComponent {
  public readonly store = inject(ArenaStateStore);
  private readonly router = inject(Router);
  public readonly metricsService = inject(HistoryMetricsService);

  public readonly metrics = this.store.telemetry;
  public readonly accelerators = signal<
    readonly { id: string; name: string; pciBus: string; isPrimaryApu: boolean }[]
  >([]);

  public readonly currentLiveVelocity = computed(() => this.store.liveTokenVelocity());
  public readonly currentRunVelocity = computed(() => this.store.runTokenVelocity());
  public readonly highWaterMark = computed(() => this.store.activeModelHighWaterMark());

  public readonly velocityHistory = signal<number[]>([15, 22, 28, 35, 32, 38]);

  /**
   * Core Frequency Reference Lines:
   * 200 MHz idle baseline (yellow dotted, unlabelled on progress bar)
   * 400 MHz low DPM state (blue dotted, unlabelled on progress bar)
   */
  public readonly sclkReferenceLines: readonly TelemetryReferenceLine[] = [
    { value: 200, color: '#eab308', style: 'dotted' },
    { value: 400, color: '#3b82f6', style: 'dotted' },
  ];

  public readonly sclk400Y = 22;
  public readonly sclk200Y = 32;
  public readonly sclkThrottleMidY = 27.5;

  public readonly velocityPercentOfHwm = computed(() => {
    const hwm = this.highWaterMark();
    if (hwm <= 0) return 0;
    const current = Math.max(this.currentLiveVelocity(), this.currentRunVelocity());
    return Math.min(100, (current / hwm) * 100);
  });

  public readonly historicVelocity = computed(() => {
    const active = this.metrics().activeModel;
    return this.metricsService.getHistoricVelocityForModel(active);
  });

  public readonly velocityVariancePercent = computed(() => {
    const hist = this.historicVelocity();
    if (hist <= 0) return null;
    const current = Math.max(this.currentLiveVelocity(), this.currentRunVelocity());
    if (current <= 0) return null;
    return ((current - hist) / hist) * 100;
  });

  public readonly Math = Math;

  constructor() {
    this.fetchAccelerators();

    effect(() => {
      const v = this.currentLiveVelocity();
      if (v > 0) {
        untracked(() => {
          this.velocityHistory.update((list) => [...list, v].slice(-30));
        });
      }
    });
  }

  public navigateToModelStats(modelId: string): void {
    if (!modelId || modelId === 'None') {
      void this.router.navigate(['/models']);
      return;
    }
    void this.router.navigate(['/models'], { queryParams: { model: modelId } });
  }

  // 105C is 100% of the temperature scale
  public readonly tempPercentOfMax = computed(() => {
    const temp = this.metrics().edgeTempCelsius;
    return Math.min(100, Math.max(0, (temp / 105) * 100));
  });

  // Color fenceposts:
  // <80: Blue, 80-85: Green, 85-90: Yellow, 90-95: Orange, 95-100: Red, 100-105: Fire Engine Red
  public readonly tempFillColor = computed(() => {
    const temp = this.metrics().edgeTempCelsius;
    if (temp >= 100) return '#ff0033'; // Fire engine red
    if (temp >= 95) return '#ef4444'; // Red
    if (temp >= 90) return '#f97316'; // Orange
    if (temp >= 85) return '#eab308'; // Yellow
    if (temp >= 80) return '#10b981'; // Green
    return '#3b82f6'; // Blue
  });

  public readonly tempZoneClass = computed(() => {
    const temp = this.metrics().edgeTempCelsius;
    if (temp >= 100) return 'fire';
    if (temp >= 95) return 'red';
    if (temp >= 90) return 'orange';
    if (temp >= 85) return 'yellow';
    if (temp >= 80) return 'green';
    return 'blue';
  });

  public readonly tempZoneLabel = computed(() => {
    const temp = this.metrics().edgeTempCelsius;
    if (temp >= 105) return 'HALT';
    if (temp >= 100) return 'OUCH!';
    if (temp >= 95) return 'CRITICAL';
    if (temp >= 90) return 'HOT';
    if (temp >= 85) return 'WARM';
    if (temp >= 80) return 'NOMINAL';
    return 'COOL';
  });

  public getLinePath(values: number[], minVal = 0, maxVal = 100, width = 200, height = 40): string {
    if (!values || values.length < 2) return `M 0,${height} L ${width},${height}`;
    const range = Math.max(1, maxVal - minVal);
    const step = width / (values.length - 1);
    return values
      .map((v, i) => {
        const x = i * step;
        const normalized = Math.max(0, Math.min(1, (v - minVal) / range));
        const y = height - normalized * (height - 6) - 3;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  public getAreaPath(values: number[], minVal = 0, maxVal = 100, width = 200, height = 40): string {
    if (!values || values.length < 2) return `M 0,${height} L ${width},${height} Z`;
    const line = this.getLinePath(values, minVal, maxVal, width, height);
    return `${line} L ${width},${height} L 0,${height} Z`;
  }

  /**
   * Maps SCLK frequency (0 - 2200 MHz) to calibrated Y coordinate in SVG sparkline.
   * Demarcates the 0-400MHz throttling zone (y=38 down to y=22) so the 200MHz and 400MHz
   * dotted thresholds have adequate vertical clearance for labels and the 'throttle' text.
   */
  public mapSclkY(mhz: number, height = 40): number {
    const clamped = Math.max(0, Math.min(2200, mhz));
    if (clamped <= 400) {
      // Calibrated throttle zone: 0MHz -> y=38, 200MHz -> y=32, 400MHz -> y=22
      const norm = clamped / 400;
      return height - 2 - norm * 16;
    }
    // Active boost range: 400MHz -> y=22, 2200MHz -> y=4
    const norm = (clamped - 400) / 1800;
    return 22 - norm * 18;
  }

  public getSclkLinePath(values: readonly number[] | number[], width = 200, height = 40): string {
    if (!values || values.length < 2) return `M 0,${height} L ${width},${height}`;
    const step = width / (values.length - 1);
    return values
      .map((v, i) => {
        const x = i * step;
        const y = this.mapSclkY(v, height);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  public getSclkAreaPath(values: readonly number[] | number[], width = 200, height = 40): string {
    if (!values || values.length < 2) return `M 0,${height} L ${width},${height} Z`;
    const line = this.getSclkLinePath(values, width, height);
    return `${line} L ${width},${height} L 0,${height} Z`;
  }

  private async fetchAccelerators(): Promise<void> {
    try {
      const res = await fetch('/api/system');
      if (res.ok) {
        const data = (await res.json()) as {
          accelerators?: { id: string; name: string; pciBus: string; isPrimaryApu: boolean }[];
        };
        if (Array.isArray(data.accelerators) && data.accelerators.length > 0) {
          this.accelerators.set(data.accelerators);
        }
      }
    } catch {
      // offline / mock fallback
    }
  }
}
