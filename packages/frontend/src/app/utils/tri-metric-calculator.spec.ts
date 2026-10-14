import { describe, it, expect } from 'vitest';
import { TriMetricCalculator } from './tri-metric-calculator';

describe('TriMetricCalculator Suite', () => {
  it('should convert values to bounded clamped percentages', () => {
    expect(TriMetricCalculator.toPercent(50, 0, 100)).toBe(50);
    expect(TriMetricCalculator.toPercent(0, 0, 100)).toBe(0);
    expect(TriMetricCalculator.toPercent(100, 0, 100)).toBe(100);
    expect(TriMetricCalculator.toPercent(-20, 0, 100)).toBe(0);
    expect(TriMetricCalculator.toPercent(150, 0, 100)).toBe(100);
    expect(TriMetricCalculator.toPercent(200, 0, 2200)).toBe(9.1);
    expect(TriMetricCalculator.toPercent(400, 0, 2200)).toBe(18.2);
    expect(TriMetricCalculator.toPercent(10, 100, 100)).toBe(0);
  });

  it('should calculate peak, average, and adaptive trough on dynamic samples', () => {
    const samples = [100, 200, 300, 400, 500];
    const stats = TriMetricCalculator.calculate(samples, 500, 0, 1000);

    expect(stats.peak).toBe(500);
    expect(stats.avg).toBe(300);
    // distance = 500 - 300 = 200; computedTrough = 300 - 200 = 100; minObserved = 100
    expect(stats.trough).toBe(100);
    expect(stats.isCluttered).toBe(false);
    expect(stats.peakPercent).toBe(50);
    expect(stats.troughPercent).toBe(10);
  });

  it('should filter zero drops and protect run floor from dragging baselines to zero', () => {
    // 0 values represent idle ticks or momentary pauses
    const samples = [400, 420, 0, 410, 0, 430];
    const stats = TriMetricCalculator.calculate(samples, 425, 0, 1000, { runFloor: 0 });

    // The zeroes should be ignored in avg and trough
    expect(stats.peak).toBe(430);
    expect(stats.avg).toBeGreaterThanOrEqual(415);
    expect(stats.trough).toBeGreaterThanOrEqual(400);
  });

  it('should detect clutter and flag isCluttered when values are too close', () => {
    // Cluttered / steady data: all values very close
    const samples = [400, 401, 400.5, 401.2, 400.8];
    const stats = TriMetricCalculator.calculate(samples, 401, 0, 1000, {
      clutterThresholdPercent: 4.0,
    });

    expect(stats.isCluttered).toBe(true);
    expect(stats.lastChangePoint).toBeCloseTo(401.2, 0);
  });

  it('should expand to uncluttered mode when variance increases', () => {
    // Dynamic movement: 200 to 1400 on 0-2200 range
    const samples = [200, 400, 800, 1200, 1400];
    const stats = TriMetricCalculator.calculate(samples, 1400, 0, 2200, {
      clutterThresholdPercent: 4.0,
    });

    expect(stats.isCluttered).toBe(false);
    expect(stats.peak).toBe(1400);
    expect(stats.trough).toBeLessThan(800);
    expect(stats.movementSpan).toBeGreaterThan(500);
  });

  it('should accurately identify last change point in history', () => {
    const samples = [200, 200, 200, 450, 450, 450];
    const change = TriMetricCalculator.findLastChangePoint(samples, 450, 0);
    expect(change).toBe(450);

    const fluctuating = [100, 150, 200, 300, 300];
    const lastChange = TriMetricCalculator.findLastChangePoint(fluctuating, 300, 0);
    expect(lastChange).toBe(300);
  });

  it('should handle empty sample list with graceful fallback to live value', () => {
    const stats = TriMetricCalculator.calculate([], 120, 0, 200);
    expect(stats.peak).toBe(120);
    expect(stats.avg).toBe(120);
    expect(stats.trough).toBe(120);
    expect(stats.liveValue).toBe(120);
    expect(stats.isCluttered).toBe(true);
  });
});
