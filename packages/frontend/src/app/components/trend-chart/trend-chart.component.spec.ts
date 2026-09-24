import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TrendChartComponent } from './trend-chart.component';

describe('TrendChartComponent', () => {
  it('should render TrendChartComponent and toggle metric series', () => {
    TestBed.configureTestingModule({
      imports: [TrendChartComponent],
    });
    const fixture = TestBed.createComponent(TrendChartComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.selectedMetric()).toBe('passRate');
    expect(comp.points().length).toBe(7);
    expect(comp.linePath()).toContain('M 0');
    expect(comp.areaPath()).toContain('Z');

    comp.selectMetric('throughput');
    expect(comp.selectedMetric()).toBe('throughput');
    expect(comp.currentSeries()[0]!.value).toBe(36);

    comp.selectMetric('failures');
    expect(comp.selectedMetric()).toBe('failures');
    expect(comp.currentSeries()[0]!.value).toBe(8);

    // Test hover tooltip
    comp.hoverPoint({ x: 50, y: 80, label: 'Day 2', value: 12 }, 1);
    expect(comp.hoveredPoint()?.value).toBe(12);
  });
});
