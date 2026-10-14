import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mocking the token throughput rate calculation function
const calculateTokenThroughputRate = (tokens: number, durationMs: number): number => {
  if (durationMs === 0) {
    return 0;
  }
  return tokens / durationMs;
};

describe('Token Throughput Rate Calculation', () => {
  it('should return 0 when duration is 0ms', () => {
    const tokens = 100;
    const durationMs = 0;
    const expectedThroughputRate = 0;

    const throughputRate = calculateTokenThroughputRate(tokens, durationMs);

    assert.strictEqual(throughputRate, expectedThroughputRate);
  });

  it('should calculate the correct throughput rate when duration is not 0ms', () => {
    const tokens = 100;
    const durationMs = 500;
    const expectedThroughputRate = 0.2;

    const throughputRate = calculateTokenThroughputRate(tokens, durationMs);

    assert.strictEqual(throughputRate, expectedThroughputRate);
  });
});
