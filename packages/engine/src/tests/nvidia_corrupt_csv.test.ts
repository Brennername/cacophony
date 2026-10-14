import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNvidiaSmiCsv } from '../telemetry/NvidiaSmiParser.js';

describe('NvidiaSmiParser', () => {
  it('parses valid comma-delimited rows accurately', () => {
    const validCsv = `
0, 55, 4096, 16384, 68, 180.5
1, 12, 1024, 8192, 45, 65.0
`;
    const samples = parseNvidiaSmiCsv(validCsv);

    assert.strictEqual(samples.length, 2);
    assert.strictEqual(samples[0]?.index, 0);
    assert.strictEqual(samples[0]?.gpuUtilizationPercent, 55);
    assert.strictEqual(samples[0]?.memoryUsedMb, 4096);
    assert.strictEqual(samples[0]?.memoryTotalMb, 16384);
    assert.strictEqual(samples[0]?.temperatureCelsius, 68);
    assert.strictEqual(samples[0]?.powerDrawWatts, 180.5);

    assert.strictEqual(samples[1]?.index, 1);
    assert.strictEqual(samples[1]?.temperatureCelsius, 45);
  });

  it('gracefully discards corrupted CSV rows missing comma delimiters', () => {
    const corruptedCsv = `
0, 50, 2048, 8192, 60, 100.0
CORRUPTED_ROW_WITHOUT_COMMAS 1 2 3 4 5
1 65 3000 8192 70 120
NVIDIA-SMI has failed because no supported devices were found
2, 80, 7000, 8192, 75, 210.0
`;
    const samples = parseNvidiaSmiCsv(corruptedCsv);

    // Only rows with valid index 0 and 2 should survive
    assert.strictEqual(samples.length, 2);
    assert.strictEqual(samples[0]?.index, 0);
    assert.strictEqual(samples[1]?.index, 2);
  });

  it('discards rows with truncated columns or non-numeric tokens', () => {
    const badColumnsCsv = `
0, 50, 2048
0, N/A, [Not Supported], 8192, ERR, 100
1, 30, 1024, 8192, 50
`;
    const samples = parseNvidiaSmiCsv(badColumnsCsv);

    assert.strictEqual(samples.length, 1);
    assert.strictEqual(samples[0]?.index, 1);
    assert.strictEqual(samples[0]?.gpuUtilizationPercent, 30);
  });

  it('handles empty input string without exceptions', () => {
    const samples = parseNvidiaSmiCsv('');
    assert.deepStrictEqual(samples, []);
  });
});
