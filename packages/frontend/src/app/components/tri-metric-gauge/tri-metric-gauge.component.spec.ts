import { describe, it, expect } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TriMetricGaugeComponent } from './tri-metric-gauge.component';

describe('TriMetricGaugeComponent', () => {
  it('should collapse to single last change point marker when data is stationary (clutter reduction)', () => {
    TestBed.configureTestingModule({
      imports: [TriMetricGaugeComponent],
    });
    const fixture: ComponentFixture<TriMetricGaugeComponent> =
      TestBed.createComponent(TriMetricGaugeComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('minRange', 0);
    fixture.componentRef.setInput('maxRange', 2200);
    fixture.componentRef.setInput('liveValue', 1000);
    fixture.componentRef.setInput('unit', 'MHz');
    fixture.componentRef.setInput('label', 'Core Frequency');
    fixture.detectChanges();

    expect(component.liveValue()).toBe(1000);
    expect(component.peak()).toBe(1000);
    expect(component.avg()).toBe(1000);
    expect(component.trough()).toBe(1000);
    expect(component.isCluttered()).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    // Clutter collapsed pin should be rendered
    expect(compiled.querySelector('.marker-last-change')).toBeTruthy();
    expect(compiled.querySelector('.pin-last-change')).toBeTruthy();
    // 3 overlapping pins should NOT be rendered when cluttered
    expect(compiled.querySelector('.marker-trough')).toBeNull();
    expect(compiled.querySelector('.marker-peak')).toBeNull();
    expect(compiled.querySelector('.progress-head')).toBeTruthy();
  });

  it('should dynamically expand to all 3 pins (low, avg, peak) when data fluctuates', () => {
    TestBed.configureTestingModule({
      imports: [TriMetricGaugeComponent],
    });
    const fixture = TestBed.createComponent(TriMetricGaugeComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('minRange', 0);
    fixture.componentRef.setInput('maxRange', 2200);
    fixture.componentRef.setInput('externalHistory', [400, 600, 1400, 1800]);
    fixture.componentRef.setInput('liveValue', 1600);
    fixture.detectChanges();

    expect(component.isCluttered()).toBe(false);
    expect(component.peak()).toBe(1800);
    expect(component.avg()).toBeGreaterThan(1000);
    expect(component.trough()).toBeLessThanOrEqual(400);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.marker-trough')).toBeTruthy();
    expect(compiled.querySelector('.marker-avg')).toBeTruthy();
    expect(compiled.querySelector('.marker-peak')).toBeTruthy();
    expect(compiled.querySelector('.marker-last-change')).toBeNull();
  });

  it('should render 200MHz yellow and 400MHz blue dotted reference lines', () => {
    TestBed.configureTestingModule({
      imports: [TriMetricGaugeComponent],
    });
    const fixture = TestBed.createComponent(TriMetricGaugeComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('minRange', 0);
    fixture.componentRef.setInput('maxRange', 2200);
    fixture.componentRef.setInput('liveValue', 800);
    fixture.componentRef.setInput('unit', 'MHz');
    fixture.componentRef.setInput('referenceLines', [
      { value: 200, color: '#eab308', label: '200M', style: 'dotted' as const },
      { value: 400, color: '#3b82f6', label: '400M', style: 'dotted' as const },
    ]);
    fixture.detectChanges();

    const lines = component.referenceLinesComputed();
    expect(lines.length).toBe(2);
    expect(lines[0]!.percent).toBe(9.1);
    expect(lines[0]!.color).toBe('#eab308');
    expect(lines[1]!.percent).toBe(18.2);
    expect(lines[1]!.color).toBe('#3b82f6');

    const compiled = fixture.nativeElement as HTMLElement;
    const refElements = compiled.querySelectorAll('.reference-line');
    expect(refElements.length).toBe(2);

    // Labels are omitted by default on progress bars to prevent header overlap
    expect(compiled.querySelectorAll('.ref-label').length).toBe(0);

    // Enabling showReferenceLabels renders the text labels
    fixture.componentRef.setInput('showReferenceLabels', true);
    fixture.detectChanges();
    expect(compiled.querySelectorAll('.ref-label').length).toBe(2);
  });

  it('should render compact variant without header or stats row', () => {
    TestBed.configureTestingModule({
      imports: [TriMetricGaugeComponent],
    });
    const fixture = TestBed.createComponent(TriMetricGaugeComponent);

    fixture.componentRef.setInput('variant', 'compact');
    fixture.componentRef.setInput('label', 'VRAM');
    fixture.componentRef.setInput('liveValue', 65);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.gauge-header')).toBeNull();
    expect(compiled.querySelector('.metric-stats-row')).toBeNull();
    expect(compiled.querySelector('.gauge-track')).toBeTruthy();
  });
});
