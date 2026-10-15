import { Component, input, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  TriMetricCalculator,
  type TriMetricStats,
  type TelemetryReferenceLine,
} from '../../utils/tri-metric-calculator';

export interface ComputedReferenceLine extends TelemetryReferenceLine {
  percent: number;
}

/**
 * TriMetricGaugeComponent
 *
 * Visual rolling-window telemetry gauge and progress bar displaying:
 * - Dynamic Peak (High Water Mark, marked in Red)
 * - Windowed Running Average (Arithmetic Mean, marked in Green)
 * - Adaptive Trough (Average Low Baseline, marked in Red)
 * - Real-Time Instantaneous Progress Head tracking live signal ticks
 * - Dynamic Clutter Collapse: when values are stationary or clustered (< threshold%),
 *   collapses down to the Last Change Point marker to prevent overlapping clutter.
 * - Reference Threshold Lines: custom dotted indicators (e.g. 200MHz yellow, 400MHz blue).
 * - Multi-variant support: 'full' (with header & stats) and 'compact' (bare track).
 */
@Component({
  selector: 'app-tri-metric-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tri-metric-gauge.component.html',
  styleUrl: './tri-metric-gauge.component.css',
})
export class TriMetricGaugeComponent {
  public readonly liveValue = input<number>(0);
  public readonly unit = input<string>('');
  public readonly label = input<string>('');
  public readonly minRange = input<number>(0);
  public readonly maxRange = input<number>(100);
  public readonly windowSize = input<number>(30);
  public readonly digits = input<number>(0);
  public readonly externalHistory = input<readonly number[] | undefined>(undefined);
  public readonly runFloor = input<number>(0);
  public readonly clutterThresholdPercent = input<number>(4.0);
  public readonly referenceLines = input<readonly TelemetryReferenceLine[] | undefined>(undefined);
  public readonly showReferenceLabels = input<boolean>(false);
  public readonly variant = input<'full' | 'compact'>('full');
  public readonly barClass = input<string>('');

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

  public readonly stats = computed<TriMetricStats>(() => {
    return TriMetricCalculator.calculate(
      this.samples(),
      this.liveValue(),
      this.minRange(),
      this.maxRange(),
      {
        windowSize: this.windowSize(),
        runFloor: this.runFloor(),
        clutterThresholdPercent: this.clutterThresholdPercent(),
      },
    );
  });

  public readonly peak = computed(() => this.stats().peak);
  public readonly avg = computed(() => this.stats().avg);
  public readonly trough = computed(() => this.stats().trough);
  public readonly lastChangePoint = computed(() => this.stats().lastChangePoint);
  public readonly isCluttered = computed(() => this.stats().isCluttered);

  public readonly livePercent = computed(() => this.stats().livePercent);
  public readonly peakPercent = computed(() => this.stats().peakPercent);
  public readonly avgPercent = computed(() => this.stats().avgPercent);
  public readonly troughPercent = computed(() => this.stats().troughPercent);
  public readonly lastChangePercent = computed(() => this.stats().lastChangePercent);

  public readonly referenceLinesComputed = computed<ComputedReferenceLine[]>(() => {
    const lines = this.referenceLines();
    if (!lines || lines.length === 0) return [];
    const min = this.minRange();
    const max = this.maxRange();
    return lines.map((line) => ({
      ...line,
      percent: TriMetricCalculator.toPercent(line.value, min, max),
    }));
  });

  public toPercent(val: number): number {
    return TriMetricCalculator.toPercent(val, this.minRange(), this.maxRange());
  }
}
