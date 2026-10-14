import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePowermetricsDump } from '../telemetry/PowermetricsParser.js';

describe('PowermetricsParser', () => {
  const fullDump = `
*** Sampled system activity (Wed Oct 14 08:00:00 2026) (1000.00ms elapsed) ***

**** Thermal pressure ****
Current pressure level: Nominal

**** Processor Power ****
CPU Power: 1250 mW
GPU Power: 450 mW
Combined Power (CPU + GPU): 1700 mW

**** Thermal Sampler ****
Die temperature: 48.50 C
CPU temperature: 49.20 C
GPU temperature: 47.10 C
`;

  it('parses complete multi-line thermal sampler dumps accurately', () => {
    const parsed = parsePowermetricsDump(fullDump);

    assert.strictEqual(parsed.thermalPressureLevel, 'Nominal');
    assert.strictEqual(parsed.dieTempCelsius, 48.5);
    assert.strictEqual(parsed.cpuTempCelsius, 49.2);
    assert.strictEqual(parsed.gpuTempCelsius, 47.1);
    assert.strictEqual(parsed.cpuPowerMw, 1250);
    assert.strictEqual(parsed.gpuPowerMw, 450);
    assert.strictEqual(parsed.combinedPowerMw, 1700);
  });

  it('handles partial dumps with missing thermal or power sections', () => {
    const partialDump = `
**** Thermal pressure ****
Current pressure level: Moderate

**** Thermal Sampler ****
Die temperature: 75.00 C
`;
    const parsed = parsePowermetricsDump(partialDump);

    assert.strictEqual(parsed.thermalPressureLevel, 'Moderate');
    assert.strictEqual(parsed.dieTempCelsius, 75.0);
    assert.strictEqual(parsed.cpuPowerMw, undefined);
  });

  it('handles corrupted, truncated, and empty dumps without throwing exceptions', () => {
    assert.doesNotThrow(() => {
      const res1 = parsePowermetricsDump('');
      assert.strictEqual(res1.thermalPressureLevel, 'Nominal');

      const res2 = parsePowermetricsDump('RANDOM_CORRUPTED_TEXT\n*** INVALID HEADER ***\n123456');
      assert.strictEqual(res2.thermalPressureLevel, 'Nominal');
    });
  });
});
