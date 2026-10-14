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
