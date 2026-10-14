import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DataPoint {
  label: string;
  value: number;
}

/**
 * KDE System Monitor aesthetic multi-series line chart with semi-transparent
 * shaded Area-Under-Curve (AOC) fills, SVG path generation, hover tooltips,
 * and metric toggles.
 */
@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trend-chart.component.html',
  styleUrl: './trend-chart.component.css',
})
export class TrendChartComponent {
  public selectedMetric = signal<'passRate' | 'throughput' | 'failures'>('passRate');

  public passRateSeries = input<DataPoint[]>([
    { label: 'Day 1', value: 75 },
    { label: 'Day 2', value: 70 },
    { label: 'Day 3', value: 85 },
    { label: 'Day 4', value: 65 },
    { label: 'Day 5', value: 80 },
    { label: 'Day 6', value: 90 },
    { label: 'Day 7', value: 82 },
  ]);

  public throughputSeries = input<DataPoint[]>([
    { label: 'Day 1', value: 36 },
    { label: 'Day 2', value: 34 },
    { label: 'Day 3', value: 38 },
    { label: 'Day 4', value: 32 },
    { label: 'Day 5', value: 37 },
    { label: 'Day 6', value: 39 },
    { label: 'Day 7', value: 36 },
  ]);

  public failureSeries = input<DataPoint[]>([
    { label: 'Day 1', value: 8 },
    { label: 'Day 2', value: 12 },
    { label: 'Day 3', value: 6 },
    { label: 'Day 4', value: 14 },
    { label: 'Day 5', value: 10 },
    { label: 'Day 6', value: 5 },
    { label: 'Day 7', value: 9 },
  ]);

  public hoveredPoint = signal<{ x: number; y: number; label: string; value: number } | null>(null);

  public readonly currentSeries = computed(() => {
    const metric = this.selectedMetric();
    if (metric === 'throughput') return this.throughputSeries();
    if (metric === 'failures') return this.failureSeries();
    return this.passRateSeries();
  });

  public readonly points = computed(() => {
    const data = this.currentSeries();
    if (data.length === 0) return [];
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const width = 500;
    const height = 180;
    const stepX = width / Math.max(data.length - 1, 1);

    return data.map((d, idx) => ({
      x: idx * stepX,
      y: height - (d.value / maxVal) * (height - 30) - 15,
      label: d.label,
      value: d.value,
    }));
  });

  public readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return pts.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  });

  public readonly areaPath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    const line = this.linePath();
    const lastX = pts[pts.length - 1]!.x;
    return `${line} L ${lastX} 200 L 0 200 Z`;
  });

  public selectMetric(metric: 'passRate' | 'throughput' | 'failures'): void {
    this.selectedMetric.set(metric);
    this.hoveredPoint.set(null);
  }

  public hoverPoint(pt: { x: number; y: number; label: string; value: number }, index: number): void {
    this.hoveredPoint.set(pt);
  }
}
