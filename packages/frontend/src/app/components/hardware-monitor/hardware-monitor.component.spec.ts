import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HardwareMonitorComponent } from './hardware-monitor.component';
import { ArenaStateStore } from '../../services/arena-state.store';
import { HistoryMetricsService } from '../../services/history-metrics.service';

describe('HardwareMonitorComponent - TriMetric Meters & Frequency Reference Lines Suite', () => {
  let component: HardwareMonitorComponent;
  let fixture: ComponentFixture<HardwareMonitorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HardwareMonitorComponent],
      providers: [provideRouter([]), ArenaStateStore, HistoryMetricsService],
    }).compileComponents();

    fixture = TestBed.createComponent(HardwareMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize HardwareMonitorComponent with defined telemetry signals', () => {
    expect(component).toBeTruthy();
    expect(component.metrics()).toBeDefined();
    expect(component.sclkReferenceLines.length).toBe(2);
  });

  it('should configure 200MHz yellow and 400MHz blue dotted reference lines on Core Frequency', () => {
    const lines = component.sclkReferenceLines;
    expect(lines).toEqual([
      { value: 200, color: '#eab308', label: '200M', style: 'dotted' },
      { value: 400, color: '#3b82f6', label: '400M', style: 'dotted' },
    ]);

    const compiled = fixture.nativeElement as HTMLElement;
    // Core frequency mhz-gauge-wrapper contains the gauge with reference lines
    const coreGauge = compiled.querySelector('.mhz-gauge-wrapper app-tri-metric-gauge');
    expect(coreGauge).toBeTruthy();

    const refLines = coreGauge?.querySelectorAll('.reference-line');
    expect(refLines?.length).toBe(2);
  });

  it('should render tri-metric compact gauge on the Token Velocity meter', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const velocityGauge = compiled.querySelector('.hwm-bar-track app-tri-metric-gauge');
    expect(velocityGauge).toBeTruthy();
  });

  it('should render shared tri-metric compact gauges across all sensor meters on the form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const meterWrappers = compiled.querySelectorAll('.meter-wrapper app-tri-metric-gauge');
    // APU Temp, VRAM, GPU Load, CPU Load, System RAM, GTT Memory = 6 sensor meters
    expect(meterWrappers.length).toBe(6);
  });

  it('should maintain rolling velocity history buffer on positive live velocity updates', () => {
    expect(component.velocityHistory().length).toBeGreaterThan(0);
    const initialLen = component.velocityHistory().length;

    // Simulate positive velocity update in store
    component.store.liveTokenVelocity.set(45.5);
    fixture.detectChanges();

    expect(component.velocityHistory().slice(-1)[0]).toBe(45.5);
  });
});
