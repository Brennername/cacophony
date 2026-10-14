/**
 * Telemetry Reference Line Definition.
 * Allows visual threshold and baseline indicators on gauges and meters.
 */
export interface TelemetryReferenceLine {
  value: number;
  color: string;
  label?: string;
  style?: 'dotted' | 'dashed' | 'solid';
}

/**
 * Options for TriMetric calculation.
 */
export interface TriMetricOptions {
  windowSize?: number;
  runFloor?: number;
  clutterThresholdPercent?: number;
  digits?: number;
  epsilon?: number;
}

/**
 * Computed TriMetric Statistics Output.
 */
export interface TriMetricStats {
  peak: number;
  avg: number;
  trough: number;
  liveValue: number;
  lastChangePoint: number;
  peakPercent: number;
  avgPercent: number;
  troughPercent: number;
  livePercent: number;
  lastChangePercent: number;
  isCluttered: boolean;
  movementSpan: number;
}

/**
 * TriMetricCalculator
 *
 * Implements the shared rolling-window algorithm for telemetry meters:
 * - High Water Mark / Dynamic Peak
 * - Windowed Arithmetic Running Average
 * - Adaptive Trough with observed dip bounding
 * - Run floor protection preventing idle 0-drops from pulling down baselines
 * - Dynamic clutter detection: collapses overlapping pins to the last change point
 *   when data is steady, and expands to full 3 pins when movement occurs.
 */
export class TriMetricCalculator {
  public static toPercent(val: number, minRange: number, maxRange: number): number {
    if (maxRange <= minRange) return 0;
    const clamped = Math.max(minRange, Math.min(maxRange, val));
    return Number((((clamped - minRange) / (maxRange - minRange)) * 100).toFixed(1));
  }

  public static findLastChangePoint(
    samples: readonly number[],
    liveValue: number,
    runFloor = 0,
    epsilon = 0.001,
  ): number {
    if (!samples || samples.length === 0) return liveValue;
    const valid = samples.filter((v) => v > runFloor);
    if (valid.length === 0) return liveValue;

    for (let i = valid.length - 1; i > 0; i--) {
      const current = valid[i]!;
      const prev = valid[i - 1]!;
      if (Math.abs(current - prev) > epsilon) {
        return current;
      }
    }
    return valid[valid.length - 1] ?? liveValue;
  }

  public static calculate(
    rawSamples: readonly number[],
    liveValue: number,
    minRange = 0,
    maxRange = 100,
    options: TriMetricOptions = {},
  ): TriMetricStats {
    const windowSize = options.windowSize ?? 30;
    const runFloor = options.runFloor ?? 0;
    const clutterThresholdPercent = options.clutterThresholdPercent ?? 4.0;
    const epsilon = options.epsilon ?? 0.001;

    const windowed = rawSamples.slice(-windowSize);
    const validSamples = windowed.filter((v) => v > runFloor);

    let peak = liveValue;
    let avg = liveValue;
    let trough = liveValue;

    if (validSamples.length > 0) {
      const candidates = liveValue > runFloor ? [...validSamples, liveValue] : validSamples;
      peak = Math.max(...candidates);

      const sum = validSamples.reduce((acc, v) => acc + v, 0);
      avg = sum / validSamples.length;

      const minObserved = Math.min(...validSamples);
      const distance = peak - avg;
      const computedTrough = Math.max(runFloor, avg - distance);
      trough = Math.min(minObserved, computedTrough);
    } else {
      peak = Math.max(runFloor, liveValue);
      avg = Math.max(runFloor, liveValue);
      trough = Math.max(runFloor, liveValue);
    }

    const lastChangePoint = this.findLastChangePoint(rawSamples, liveValue, runFloor, epsilon);

    const peakPercent = this.toPercent(peak, minRange, maxRange);
    const avgPercent = this.toPercent(avg, minRange, maxRange);
    const troughPercent = this.toPercent(trough, minRange, maxRange);
    const livePercent = this.toPercent(liveValue, minRange, maxRange);
    const lastChangePercent = this.toPercent(lastChangePoint, minRange, maxRange);

    const movementSpan = Math.max(0, peak - trough);
    const spanPercent = Math.abs(peakPercent - troughPercent);
    const isCluttered = spanPercent < clutterThresholdPercent;

    return {
      peak,
      avg,
      trough,
      liveValue,
      lastChangePoint,
      peakPercent,
      avgPercent,
      troughPercent,
      livePercent,
      lastChangePercent,
      isCluttered,
      movementSpan,
    };
  }
}
