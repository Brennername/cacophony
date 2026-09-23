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
  template: `
    <div class="cacophony-card chart-card">
      <div class="chart-header">
        <div>
          <h2>System Performance & Failure Trends (AOC)</h2>
          <span class="subtext">Lightweight reactive vector area chart</span>
        </div>

        <!-- Metric Toggles -->
        <div class="toggle-group">
          <button
            class="toggle-btn"
            [class.active]="selectedMetric() === 'passRate'"
            (click)="selectMetric('passRate')"
          >
            Pass Rate %
          </button>
          <button
            class="toggle-btn"
            [class.active]="selectedMetric() === 'throughput'"
            (click)="selectMetric('throughput')"
          >
            Velocity (tok/s)
          </button>
          <button
            class="toggle-btn"
            [class.active]="selectedMetric() === 'failures'"
            (click)="selectMetric('failures')"
          >
            Failures
          </button>
        </div>
      </div>

      <!-- SVG Area Under Curve Canvas -->
      <div class="svg-container">
        <svg viewBox="0 0 500 200" class="aoc-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="aocGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.45" />
              <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.02" />
            </linearGradient>
          </defs>

          <!-- Horizontal Grid Lines -->
          <line x1="0" y1="40" x2="500" y2="40" stroke="var(--border-subtle)" stroke-dasharray="4" />
          <line x1="0" y1="100" x2="500" y2="100" stroke="var(--border-subtle)" stroke-dasharray="4" />
          <line x1="0" y1="160" x2="500" y2="160" stroke="var(--border-subtle)" stroke-dasharray="4" />

          <!-- Shaded Area Under Curve -->
          <path [attr.d]="areaPath()" fill="url(#aocGradient)" />

          <!-- Primary Trend Line -->
          <path [attr.d]="linePath()" fill="none" stroke="#3b82f6" stroke-width="2.5" />

          <!-- Data Points -->
          @for (pt of points(); track pt.x; let idx = $index) {
            <circle
              [attr.cx]="pt.x"
              [attr.cy]="pt.y"
              r="4"
              class="data-circle"
              (mouseenter)="hoverPoint(pt, idx)"
            />
          }
        </svg>

        <!-- Interactive Hover Tooltip -->
        @if (hoveredPoint(); as hp) {
          <div
            class="chart-tooltip"
            [style.left.px]="hp.x"
            [style.top.px]="hp.y - 40"
          >
            <span class="tooltip-label">{{ hp.label }}</span>
            <span class="tooltip-val font-mono">{{ hp.value }}</span>
          </div>
        }
      </div>

      <!-- X-Axis Labels -->
      <div class="axis-labels font-mono">
        @for (pt of currentSeries(); track pt.label) {
          <span>{{ pt.label }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .chart-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .subtext {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .toggle-group {
      display: flex;
      gap: 0.35rem;
    }

    .toggle-btn {
      padding: 0.25rem 0.6rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 0.75rem;
      cursor: pointer;
      font-family: var(--font-sans);
    }

    .toggle-btn.active {
      color: var(--color-brand);
      border-color: var(--color-brand);
      background: rgba(59, 130, 246, 0.1);
      font-weight: 600;
    }

    .svg-container {
      position: relative;
      height: 180px;
      width: 100%;
    }

    .aoc-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .data-circle {
      fill: #3b82f6;
      stroke: var(--bg-primary);
      stroke-width: 2;
      cursor: pointer;
      transition: r 0.15s ease;
    }

    .data-circle:hover {
      r: 6;
      fill: #60a5fa;
    }

    .chart-tooltip {
      position: absolute;
      transform: translate(-50%, -100%);
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: var(--shadow-md);
      z-index: 10;
    }

    .tooltip-label {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .tooltip-val {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .axis-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.6875rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border-subtle);
      padding-top: 0.35rem;
    }
  `],
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
