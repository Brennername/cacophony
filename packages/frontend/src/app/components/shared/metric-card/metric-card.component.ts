import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type MetricStatus = 'nominal' | 'warning' | 'critical' | 'info';

/**
 * High-density telemetry and metric status indicator card component.
 * Renders formatted value, unit, status badge, optional sparkline SVG trend,
 * and contextual subtitles using curated HSL color schemes.
 */
@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metric-card.component.html',
  styleUrls: ['./metric-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
  public readonly title = input.required<string>();
  public readonly value = input.required<string | number>();
  public readonly unit = input<string>('');
  public readonly status = input<MetricStatus>('nominal');
  public readonly trend = input<readonly number[]>([]);
  public readonly subtitle = input<string>('');

  /**
   * Generates SVG polyline points string from input trend numbers.
   * Scales points to a 100x30 viewport.
   */
  public readonly sparklinePoints = computed<string>(() => {
    const data = this.trend();
    if (!data || data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 100;
    const height = 30;

    return data
      .map((val, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });
}
