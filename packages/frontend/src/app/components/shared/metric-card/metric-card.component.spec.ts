import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { MetricCardComponent } from './metric-card.component';

describe('MetricCardComponent', () => {
  let fixture: ComponentFixture<MetricCardComponent>;
  let component: MetricCardComponent;
  let componentRef: ComponentRef<MetricCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricCardComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('title', 'Arena Throughput');
    componentRef.setInput('value', 42.5);
    componentRef.setInput('unit', 'tok/s');
    componentRef.setInput('status', 'nominal');
    componentRef.setInput('trend', [10, 20, 15, 35, 42]);
    componentRef.setInput('subtitle', 'Last 10 minutes');

    fixture.detectChanges();
  });

  it('should render title, value, unit, and subtitle correctly', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.metric-card-title')?.textContent).toContain('Arena Throughput');
    expect(compiled.querySelector('.metric-value')?.textContent).toContain('42.5');
    expect(compiled.querySelector('.metric-unit')?.textContent).toContain('tok/s');
    expect(compiled.querySelector('.status-indicator')?.textContent).toContain('NOMINAL');
    expect(compiled.querySelector('.metric-subtitle')?.textContent).toContain('Last 10 minutes');
  });

  it('should compute sparkline points for trend data', () => {
    expect(component.sparklinePoints()).toBeTruthy();
    expect(component.sparklinePoints().split(' ').length).toBe(5);
  });

  it('should return empty string for sparkline when trend data has fewer than 2 points', () => {
    componentRef.setInput('trend', [10]);
    fixture.detectChanges();
    expect(component.sparklinePoints()).toBe('');
  });
});
