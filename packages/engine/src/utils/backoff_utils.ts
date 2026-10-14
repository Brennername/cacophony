/**
 * @file backoff_utils.ts
 * Robust exponential backoff with full jitter calculations for resilient
 * retry loops, API rate-limiting, and network fault tolerance.
 */

export interface BackoffOptions {
  readonly minDelayMs: number;
  readonly maxDelayMs: number;
  readonly factor?: number;
  readonly jitterRatio?: number;
}

/**
 * Calculates exponential backoff with random jitter, strictly maintaining
 * bounds between minDelayMs and maxDelayMs.
 *
 * Formula:
 * 1. Base backoff = minDelayMs * (factor ^ attempt)
 * 2. Capped at maxDelayMs
 * 3. Jitter applied: +/- jitterRatio * uncapped interval
 * 4. Strictly clamped to [minDelayMs, maxDelayMs]
 *
 * @param attempt - 0-indexed retry attempt count
 * @param minDelayMs - Minimum delay floor in milliseconds
 * @param maxDelayMs - Maximum delay ceiling in milliseconds
 * @param jitterRatio - Fraction of delay to vary randomly (0.0 to 1.0, default 0.25)
 * @returns Computed delay in milliseconds, guaranteed to satisfy minDelayMs <= delay <= maxDelayMs
 */
export function calculateExponentialBackoffWithJitter(
  attempt: number,
  minDelayMs: number,
  maxDelayMs: number,
  jitterRatio: number = 0.25,
): number {
  const safeMin = Math.max(0, Number.isFinite(minDelayMs) ? minDelayMs : 0);
  const safeMax = Math.max(safeMin, Number.isFinite(maxDelayMs) ? maxDelayMs : safeMin);

  if (safeMin === safeMax) {
    return safeMin;
  }

  const safeAttempt = Math.max(0, Math.floor(attempt));
  const factor = 2;

  // Calculate exponential progression avoiding integer overflow
  const rawExponent = Math.min(30, safeAttempt);
  const exponentialDelay = safeMin * Math.pow(factor, rawExponent);
  const baseDelay = Math.min(safeMax, Math.max(safeMin, exponentialDelay));

  // Calculate jitter interval
  const safeJitterRatio = Math.max(0, Math.min(1.0, jitterRatio));
  const maxVariance = baseDelay * safeJitterRatio;
  const randomVariance = (Math.random() * 2 - 1) * maxVariance;

  const candidateDelay = Math.round(baseDelay + randomVariance);

  // Guarantee strict clamping within [safeMin, safeMax]
  return Math.min(safeMax, Math.max(safeMin, candidateDelay));
}
