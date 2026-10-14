/**
 * @file math_utils.ts
 * Core mathematical and statistical utilities for telemetry calculation,
 * throughput measurement, and metric normalization across the engine.
 */

/**
 * Calculates token throughput rate in tokens per second.
 * Defensively guards against division by zero and invalid time durations.
 *
 * @param tokens - Number of tokens generated or evaluated
 * @param durationMs - Duration of generation in milliseconds
 * @returns Rate in tokens/sec, clamped to 0.0 when duration <= 0ms
 */
export function calculateTokenThroughputRate(
  tokens: number,
  durationMs: number,
): number {
  if (
    !Number.isFinite(tokens) ||
    !Number.isFinite(durationMs) ||
    tokens <= 0 ||
    durationMs <= 0
  ) {
    return 0.0;
  }

  const rate = (tokens / durationMs) * 1000;
  return Number(rate.toFixed(2));
}

/**
 * Calculates the moving average across a stream of numeric observations.
 * Supports windowed averaging by considering the trailing N elements.
 *
 * @param stream - Array of numeric samples
 * @param windowSize - Optional maximum number of trailing samples to consider
 * @returns Arithmetic mean of the samples, or 0.0 if the stream is empty
 */
export function calculateMovingAverage(
  stream: readonly number[],
  windowSize?: number,
): number {
  if (!stream || stream.length === 0) {
    return 0.0;
  }

  const window =
    windowSize !== undefined && windowSize > 0 && windowSize < stream.length
      ? stream.slice(-windowSize)
      : stream;

  const validNumbers = window.filter((n) => Number.isFinite(n));
  if (validNumbers.length === 0) {
    return 0.0;
  }

  const sum = validNumbers.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / validNumbers.length;
  return Number(avg.toFixed(4));
}

/**
 * Bounds a percentage value strictly within [0.0, 100.0] and rounds
 * to the specified decimal precision.
 *
 * @param value - Raw percentage or ratio value
 * @param precision - Number of decimal places (default 2)
 * @returns Clamped and rounded percentage
 */
export function clampPercentage(
  value: number,
  precision: number = 2,
): number {
  if (!Number.isFinite(value)) {
    return 0.0;
  }

  const clamped = Math.min(100.0, Math.max(0.0, value));
  const factor = Math.pow(10, Math.max(0, precision));
  return Math.round(clamped * factor) / factor;
}
