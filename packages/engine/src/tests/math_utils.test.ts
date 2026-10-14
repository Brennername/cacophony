import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMovingAverage } from '../utils/math_utils.js';

describe('calculateMovingAverage', () => {
  it('returns 0.0 when stream is empty', () => {
    assert.strictEqual(calculateMovingAverage([]), 0.0);
  });

  it('handles single-element numeric stream correctly', () => {
    assert.strictEqual(calculateMovingAverage([42]), 42.0);
    assert.strictEqual(calculateMovingAverage([0]), 0.0);
    assert.strictEqual(calculateMovingAverage([-15.5]), -15.5);
  });

  it('calculates average across small multi-element stream', () => {
    const stream = [10, 20, 30, 40, 50];
    assert.strictEqual(calculateMovingAverage(stream), 30.0);
  });

  it('calculates moving average with window constraint', () => {
    const stream = [10, 20, 30, 40, 50];
    // Window of last 3 items: [30, 40, 50] -> avg = 40.0
    assert.strictEqual(calculateMovingAverage(stream, 3), 40.0);
  });

  it('handles large numeric stream accurately', () => {
    const largeStream = Array.from({ length: 1000 }, () => 100);
    assert.strictEqual(calculateMovingAverage(largeStream), 100.0);

    const arithmeticProgression = Array.from({ length: 1001 }, (_, i) => i);
    // Sum of 0..1000 = 500500, count = 1001 -> avg = 500.0
    assert.strictEqual(calculateMovingAverage(arithmeticProgression), 500.0);
  });

  it('filters out non-finite numbers safely', () => {
    const streamWithInvalid = [10, NaN, 20, Infinity, 30, -Infinity];
    // Valid numbers: [10, 20, 30] -> avg = 20.0
    assert.strictEqual(calculateMovingAverage(streamWithInvalid), 20.0);
  });
});
