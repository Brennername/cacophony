import { describe, it, expect } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TriMetricGaugeComponent } from './tri-metric-gauge.component';

describe('TriMetricGaugeComponent', () => {
  it('should initialize and calculate peak, avg, and trough correctly', () => {
    TestBed.configureTestingModule({
      imports: [TriMetricGaugeComponent],
    });
    const fixture: ComponentFixture<TriMetricGaugeComponent> = TestBed.createComponent(TriMetricGaugeComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('minRange', 0);
    fixture.componentRef.setInput('maxRange', 2000);
    fixture.componentRef.setInput('liveValue', 1000);
    fixture.componentRef.setInput('unit', 'MHz');
    fixture.componentRef.setInput('label', 'Core Frequency');
    fixture.detectChanges();

    expect(component.liveValue()).toBe(1000);
    expect(component.peak()).toBe(1000);
    expect(component.avg()).toBe(1000);
    expect(component.trough()).toBe(1000);
    expect(component.livePercent()).toBe(50);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.marker-trough')).toBeTruthy();
    expect(compiled.querySelector('.marker-avg')).toBeTruthy();
    expect(compiled.querySelector('.marker-peak')).toBeTruthy();
    expect(compiled.querySelector('.progress-head')).toBeTruthy();
  });

  it('should adapt metrics as new samples arrive in rolling window', () => {
    TestBed.configureTestingModule({
      imports: [TriMetricGaugeComponent],
    });
    const fixture = TestBed.createComponent(TriMetricGaugeComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('minRange', 0);
    fixture.componentRef.setInput('maxRange', 2000);
    fixture.componentRef.setInput('externalHistory', [600, 800, 1400, 1200]);
    fixture.componentRef.setInput('liveValue', 1500);
    fixture.detectChanges();

    expect(component.peak()).toBe(1500);
    expect(component.avg()).toBeGreaterThan(900);
    expect(component.trough()).toBeLessThanOrEqual(600);
  });
});
