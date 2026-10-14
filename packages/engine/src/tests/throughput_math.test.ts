import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTokenThroughputRate } from '../utils/math_utils.js';

describe('Token Throughput Rate Calculation', () => {
  it('should return 0 when duration is 0ms', () => {
    const throughputRate = calculateTokenThroughputRate(100, 0);
    assert.strictEqual(throughputRate, 0);
  });

  it('should return 0 when duration is negative or non-finite', () => {
    assert.strictEqual(calculateTokenThroughputRate(100, -50), 0);
    assert.strictEqual(calculateTokenThroughputRate(100, NaN), 0);
    assert.strictEqual(calculateTokenThroughputRate(100, Infinity), 0);
  });

  it('should return 0 when token count is zero or negative', () => {
    assert.strictEqual(calculateTokenThroughputRate(0, 1000), 0);
    assert.strictEqual(calculateTokenThroughputRate(-10, 1000), 0);
  });

  it('should calculate the correct tokens per second throughput rate', () => {
    // 100 tokens in 500ms -> 200.0 tokens/sec
    const rate1 = calculateTokenThroughputRate(100, 500);
    assert.strictEqual(rate1, 200);

    // 50 tokens in 1000ms -> 50.0 tokens/sec
    const rate2 = calculateTokenThroughputRate(50, 1000);
    assert.strictEqual(rate2, 50);

    // 10 tokens in 300ms -> 33.33 tokens/sec
    const rate3 = calculateTokenThroughputRate(10, 300);
    assert.strictEqual(rate3, 33.33);
  });
});
