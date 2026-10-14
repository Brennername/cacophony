import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSensorsOutput } from '../telemetry/SensorsParser.js';

describe('SensorsParser', () => {
  const sampleSensorsOutput = `
k10temp-pci-00c3
Adapter: PCI adapter
Tctl:         +45.2°C
Tdie:         +45.2°C

amdgpu-pci-0300
Adapter: PCI adapter
vddgfx:        1.15 V
edge:         +52.0°C  (crit = +100.0°C, hyst = -273.1°C)
power1:       35.00 W

coretemp-isa-0000
Adapter: ISA adapter
Package id 0:  +62.5°C  (high = +80.0°C, crit = +100.0°C)
Core 0:        +58.0°C  (high = +80.0°C, crit = +100.0°C)
Core 1:        +60.1°C  (high = +80.0°C, crit = +100.0°C)
`;

  it('accurately extracts Tctl, edge, and Package id temperatures in Celsius', () => {
    const result = parseSensorsOutput(sampleSensorsOutput);

    assert.strictEqual(result.tctlCelsius, 45.2);
    assert.strictEqual(result.edgeCelsius, 52.0);
    assert.strictEqual(result.packageIdCelsius, 62.5);
  });

  it('records individual sensor readings in the readings map', () => {
    const result = parseSensorsOutput(sampleSensorsOutput);

    assert.strictEqual(result.readings['Tctl'], 45.2);
    assert.strictEqual(result.readings['edge'], 52.0);
    assert.strictEqual(result.readings['Package id 0'], 62.5);
    assert.strictEqual(result.readings['Core 0'], 58.0);
    assert.strictEqual(result.readings['Core 1'], 60.1);
  });

  it('handles negative temperatures and varied whitespace', () => {
    const negativeOutput = `
subzero-sensor
Adapter: Virtual
edge:   -12.4 C  (hyst = -20.0 C)
Tctl: -5.0°C
Package id 1: +0.0°C
`;
    const result = parseSensorsOutput(negativeOutput);
    assert.strictEqual(result.edgeCelsius, -12.4);
    assert.strictEqual(result.tctlCelsius, -5.0);
    assert.strictEqual(result.packageIdCelsius, 0.0);
  });

  it('handles empty or non-matching string input gracefully', () => {
    const emptyResult = parseSensorsOutput('');
    assert.strictEqual(emptyResult.tctlCelsius, undefined);
    assert.strictEqual(emptyResult.edgeCelsius, undefined);
    assert.strictEqual(emptyResult.packageIdCelsius, undefined);
    assert.deepStrictEqual(emptyResult.readings, {});
  });
});
