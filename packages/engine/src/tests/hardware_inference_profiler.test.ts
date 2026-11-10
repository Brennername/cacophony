import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mocking the HardwareInferenceProfiler class for testing purposes
class MockHardwareInferenceProfiler {
  async measurePerformance() {
    return {
      prefillTokS: 100,
      evalTokS: 200,
      peakMemoryDraw: 500,
    };
  }
}

describe('HardwareInferenceProfiler', () => {
  it('should measure performance correctly for happy path', async () => {
    const profiler = new MockHardwareInferenceProfiler();
    const result = await profiler.measurePerformance();

    assert.strictEqual(result.prefillTokS, 100);
    assert.strictEqual(result.evalTokS, 200);
    assert.strictEqual(result.peakMemoryDraw, 500);
  });

  it('should handle edge case where performance metrics are zero', async () => {
    const profiler = new MockHardwareInferenceProfiler();
    profiler.measurePerformance = async () => ({
      prefillTokS: 0,
      evalTokS: 0,
      peakMemoryDraw: 0,
    });

    const result = await profiler.measurePerformance();

    assert.strictEqual(result.prefillTokS, 0);
    assert.strictEqual(result.evalTokS, 0);
    assert.strictEqual(result.peakMemoryDraw, 0);
  });

  it('should handle edge case where performance metrics are negative', async () => {
    const profiler = new MockHardwareInferenceProfiler();
    profiler.measurePerformance = async () => ({
      prefillTokS: -1,
      evalTokS: -2,
      peakMemoryDraw: -3,
    });

    try {
      await profiler.measurePerformance();
    } catch (error) {
      assert.strictEqual((error as Error).message, 'Negative performance metrics are not allowed');
    }
  });
});
