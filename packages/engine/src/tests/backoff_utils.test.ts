import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateExponentialBackoffWithJitter } from '../utils/backoff_utils.js';

describe('calculateExponentialBackoffWithJitter', () => {
  const minDelayMs = 500;
  const maxDelayMs = 10000;

  it('guarantees calculated delay is strictly within min and max delay limits for all attempts', () => {
    for (let attempt = 0; attempt <= 20; attempt++) {
      for (let run = 0; run < 10; run++) {
        const delay = calculateExponentialBackoffWithJitter(
          attempt,
          minDelayMs,
          maxDelayMs,
        );
        assert(
          delay >= minDelayMs,
          `Delay ${delay} is below minDelayMs ${minDelayMs} at attempt ${attempt}`,
        );
        assert(
          delay <= maxDelayMs,
          `Delay ${delay} exceeds maxDelayMs ${maxDelayMs} at attempt ${attempt}`,
        );
      }
    }
  });

  it('handles attempt 0 near minimum delay bound', () => {
    for (let run = 0; run < 10; run++) {
      const delay = calculateExponentialBackoffWithJitter(0, 1000, 30000, 0.2);
      // Attempt 0 base is 1000, +/- 20% jitter -> [800, 1200], clamped to min 1000 -> [1000, 1200]
      assert(delay >= 1000 && delay <= 1200);
    }
  });

  it('caps at maxDelayMs for high attempt numbers', () => {
    for (let run = 0; run < 10; run++) {
      const delay = calculateExponentialBackoffWithJitter(15, 500, 5000, 0.1);
      assert(delay <= 5000);
      assert(delay >= 4500); // within 10% jitter of 5000
    }
  });

  it('handles zero or negative attempt counts safely', () => {
    const delayNeg = calculateExponentialBackoffWithJitter(-3, 100, 5000);
    assert(delayNeg >= 100 && delayNeg <= 5000);
  });

  it('returns exact delay when minDelay equals maxDelay', () => {
    const delay = calculateExponentialBackoffWithJitter(5, 2000, 2000);
    assert.strictEqual(delay, 2000);
  });
});
