import { Component, input, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * TriMetricGaugeComponent
 *
 * Visual rolling-window gauge displaying:
 * - Dynamic Peak (High Water Mark, marked in Red)
 * - Windowed Running Average (Arithmetic Mean, marked in Green)
 * - Adaptive Trough (Average Low Baseline, marked in Red)
 * - Real-Time Instantaneous Progress Head tracking live signal ticks
 */
@Component({
  selector: 'app-tri-metric-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tri-metric-container">
      @if (label()) {
        <div class="gauge-header">
          <span class="gauge-label">{{ label() }}</span>
          <span class="gauge-live font-mono">
            <span class="live-val">{{ liveValue().toFixed(digits()) }}</span>
            <span class="unit-text">{{ unit() }}</span>
          </span>
        </div>
      }

      <!-- Multi-Point Gauge Track -->
      <div class="gauge-track">
        <!-- Live Fill Bar -->
        <div
          class="live-fill"
          [style.width.%]="livePercent()"
        ></div>

        <!-- Trough (Low) Marker in Red -->
        <div
          class="metric-marker marker-trough"
          [style.left.%]="troughPercent()"
          [title]="'Trough Low: ' + trough().toFixed(digits()) + ' ' + unit()"
        >
          <div class="marker-pin pin-red"></div>
        </div>

        <!-- Average Marker in Green -->
        <div
          class="metric-marker marker-avg"
          [style.left.%]="avgPercent()"
          [title]="'Window Average: ' + avg().toFixed(digits()) + ' ' + unit()"
        >
          <div class="marker-pin pin-green"></div>
        </div>

        <!-- Peak (High) Marker in Red -->
        <div
          class="metric-marker marker-peak"
          [style.left.%]="peakPercent()"
          [title]="'Peak High: ' + peak().toFixed(digits()) + ' ' + unit()"
        >
          <div class="marker-pin pin-red"></div>
        </div>

        <!-- Live Needle / Progress Head -->
        <div
          class="progress-head"
          [style.left.%]="livePercent()"
          [title]="'Live: ' + liveValue().toFixed(digits()) + ' ' + unit()"
        ></div>
      </div>

      <!-- KPI Readouts Row: Low (Red) | Avg (Green) | Peak (Red) -->
      <div class="metric-stats-row font-mono">
        <div class="stat-item stat-trough" title="Average Low / Trough">
          <span class="stat-label">LOW</span>
          <span class="stat-val text-red">{{ trough().toFixed(digits()) }}</span>
        </div>
        <div class="stat-item stat-avg" title="Window Running Average">
          <span class="stat-label">AVG</span>
          <span class="stat-val text-green">{{ avg().toFixed(digits()) }}</span>
        </div>
        <div class="stat-item stat-peak" title="Window Peak">
          <span class="stat-label">PEAK</span>
          <span class="stat-val text-red">{{ peak().toFixed(digits()) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tri-metric-container {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      width: 100%;
    }

    .gauge-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 0.75rem;
    }

    .gauge-label {
      color: var(--text-muted, #94a3b8);
      font-weight: 500;
    }

    .gauge-live {
      display: flex;
      align-items: baseline;
      gap: 0.2rem;
      color: var(--text-primary, #f1f5f9);
      font-weight: 600;
    }

    .unit-text {
      font-size: 0.65rem;
      color: var(--text-muted, #94a3b8);
    }

    .gauge-track {
      position: relative;
      height: 0.75rem;
      background: var(--bg-track, rgba(255, 255, 255, 0.08));
      border-radius: 9999px;
      overflow: visible;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .live-fill {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      background: linear-gradient(90deg, rgba(59, 130, 246, 0.4), rgba(59, 130, 246, 0.85));
      border-radius: 9999px;
      transition: width 150ms ease-out;
      pointer-events: none;
    }

    .metric-marker {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 2;
    }

    .marker-pin {
      width: 2px;
      height: 100%;
      border-radius: 1px;
    }

    .pin-red {
      background: #ef4444;
      box-shadow: 0 0 4px rgba(239, 68, 68, 0.8);
    }

    .pin-green {
      background: #10b981;
      box-shadow: 0 0 5px rgba(16, 185, 129, 0.9);
      width: 3px;
    }

    .progress-head {
      position: absolute;
      top: -3px;
      bottom: -3px;
      width: 6px;
      background: #ffffff;
      border: 1.5px solid #3b82f6;
      border-radius: 9999px;
      transform: translateX(-50%);
      z-index: 3;
      box-shadow: 0 0 6px rgba(59, 130, 246, 0.9);
      transition: left 120ms ease-out;
    }

    .metric-stats-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.65rem;
      padding: 0 0.15rem;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .stat-label {
      color: var(--text-muted, #64748b);
      font-size: 0.6rem;
      font-weight: 600;
    }

    .text-red {
      color: #ef4444;
      font-weight: 600;
    }

    .text-green {
      color: #10b981;
      font-weight: 700;
    }
  `]
})
export class TriMetricGaugeComponent {
  public readonly liveValue = input<number>(0);
  public readonly unit = input<string>('');
  public readonly label = input<string>('');
  public readonly minRange = input<number>(0);
  public readonly maxRange = input<number>(100);
  public readonly windowSize = input<number>(30);
  public readonly digits = input<number>(0);
  public readonly externalHistory = input<number[] | undefined>(undefined);

  private readonly samples = signal<number[]>([]);

  constructor() {
    effect(() => {
      const val = this.liveValue();
      const ext = this.externalHistory();
      const win = this.windowSize();
      if (ext && ext.length > 0) {
        this.samples.set(ext.slice(-win));
      } else {
        const cur = untracked(() => this.samples());
        const next = [...cur, val].slice(-win);
        this.samples.set(next);
      }
    });
  }

  public readonly peak = computed(() => {
    const list = this.samples();
    if (list.length === 0) return this.liveValue();
    return Math.max(...list, this.liveValue());
  });

  public readonly avg = computed(() => {
    const list = this.samples();
    if (list.length === 0) return this.liveValue();
    const sum = list.reduce((acc, v) => acc + v, 0);
    return sum / list.length;
  });

  public readonly trough = computed(() => {
    const list = this.samples().filter((v) => v > 0);
    if (list.length === 0) return 0;
    const minObserved = Math.min(...list);
    const mean = this.avg();
    const high = this.peak();
    // Distance from peak to avg mapped downwards from average
    const distance = high - mean;
    const computedTrough = Math.max(0, mean - distance);
    // If real samples dip lower than the computed trough, adapt to the minimum observed dip
    return Math.min(minObserved, computedTrough);
  });

  public readonly livePercent = computed(() => {
    return this.toPercent(this.liveValue());
  });

  public readonly peakPercent = computed(() => {
    return this.toPercent(this.peak());
  });

  public readonly avgPercent = computed(() => {
    return this.toPercent(this.avg());
  });

  public readonly troughPercent = computed(() => {
    return this.toPercent(this.trough());
  });

  private toPercent(val: number): number {
    const min = this.minRange();
    const max = this.maxRange();
    if (max <= min) return 0;
    const clamped = Math.max(min, Math.min(max, val));
    return Number((((clamped - min) / (max - min)) * 100).toFixed(1));
  }
}
