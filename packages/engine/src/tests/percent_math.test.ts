import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clampPercentage } from '../utils/math_utils.js';

describe('clampPercentage', () => {
  it('clamps values below 0.0 to 0.0', () => {
    assert.strictEqual(clampPercentage(-0.1), 0.0);
    assert.strictEqual(clampPercentage(-50.0), 0.0);
    assert.strictEqual(clampPercentage(-999999), 0.0);
  });

  it('clamps values above 100.0 to 100.0', () => {
    assert.strictEqual(clampPercentage(100.01), 100.0);
    assert.strictEqual(clampPercentage(150.0), 100.0);
    assert.strictEqual(clampPercentage(999999), 100.0);
  });

  it('preserves valid percentage values within [0.0, 100.0]', () => {
    assert.strictEqual(clampPercentage(0.0), 0.0);
    assert.strictEqual(clampPercentage(50.0), 50.0);
    assert.strictEqual(clampPercentage(100.0), 100.0);
    assert.strictEqual(clampPercentage(33.33), 33.33);
  });

  it('respects custom rounding precision', () => {
    assert.strictEqual(clampPercentage(33.333333, 0), 33);
    assert.strictEqual(clampPercentage(33.333333, 1), 33.3);
    assert.strictEqual(clampPercentage(33.333333, 2), 33.33);
    assert.strictEqual(clampPercentage(33.333333, 4), 33.3333);
  });

  it('handles non-finite values by returning 0.0 safely', () => {
    assert.strictEqual(clampPercentage(NaN), 0.0);
    assert.strictEqual(clampPercentage(Infinity), 0.0);
    assert.strictEqual(clampPercentage(-Infinity), 0.0);
  });
});
