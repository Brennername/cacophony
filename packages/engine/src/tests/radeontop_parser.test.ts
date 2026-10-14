import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRadeontopLine } from '../telemetry/RadeontopParser.js';

describe('RadeontopParser', () => {
  it('parses standard radeontop dump output with percentages and VRAM megabytes', () => {
    const line =
      '1728900000.123456: bus 03, gpu 45.00%, ee 0.00%, vgt 0.00%, ta 23.50%, sx 12.00%, sh 0.00%, vram 62.50% 1024mb, gtt 15.00% 256mb, mclk 100.00% 1.000ghz, sclk 45.20% 1.200ghz';

    const metrics = parseRadeontopLine(line);

    assert.strictEqual(metrics.gpuBusyPercent, 45.0);
    assert.strictEqual(metrics.vramPercent, 62.5);
    assert.strictEqual(metrics.vramUsedMb, 1024);
    assert.strictEqual(metrics.gttPercent, 15.0);
    assert.strictEqual(metrics.gttUsedMb, 256);
    assert.strictEqual(metrics.sclkPercent, 45.2);
    assert.strictEqual(metrics.mclkPercent, 100.0);
  });

  it('handles non-standard whitespace, multiple tabs, and missing timestamp prefixes', () => {
    const messyLine =
      'gpu\t\t88.50%  ,\t\tvram   95.00%   4096MB,\t   gtt   5.25%  128mb';

    const metrics = parseRadeontopLine(messyLine);

    assert.strictEqual(metrics.gpuBusyPercent, 88.5);
    assert.strictEqual(metrics.vramPercent, 95.0);
    assert.strictEqual(metrics.vramUsedMb, 4096);
    assert.strictEqual(metrics.gttPercent, 5.25);
    assert.strictEqual(metrics.gttUsedMb, 128);
  });

  it('clamps percentages strictly between 0.0 and 100.0', () => {
    const clampedLine = 'gpu 105.00%, vram -10.00% 0mb, gtt 50.00%';
    const metrics = parseRadeontopLine(clampedLine);

    assert.strictEqual(metrics.gpuBusyPercent, 100.0);
    assert.strictEqual(metrics.gttPercent, 50.0);
  });

  it('returns default zero values for empty or non-matching string safely', () => {
    const emptyMetrics = parseRadeontopLine('');
    assert.strictEqual(emptyMetrics.gpuBusyPercent, 0.0);
    assert.strictEqual(emptyMetrics.vramPercent, 0.0);
    assert.strictEqual(emptyMetrics.gttPercent, 0.0);
  });
});
