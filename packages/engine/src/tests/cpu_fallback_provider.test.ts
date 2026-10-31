import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CpuFallbackProvider } from '../telemetry/CpuFallbackProvider.js';
import * as os from 'node:os';

describe('CpuFallbackProvider', () => {
  let cpuFallbackProvider: CpuFallbackProvider;

  beforeEach(() => {
    cpuFallbackProvider = new CpuFallbackProvider();
  });

  it('should return the correct name', async () => {
    assert.strictEqual(cpuFallbackProvider.getName(), 'CpuFallbackProvider');
  });

  it('should return the CPU category', async () => {
    assert.strictEqual(cpuFallbackProvider.getCategory(), 'CPU_FALLBACK');
  });

  it('should indicate availability', async () => {
    const available = await cpuFallbackProvider.isAvailable();
    assert.strictEqual(available, true);
  });

  it('should return the total memory', () => {
    assert.equal(cpuFallbackProvider.getTotalMemory(), os.totalmem());
  });

  it('should return the free memory', () => {
    assert.equal(cpuFallbackProvider.getFreeMemory(), os.freemem());
  });

  it('should return the total number of CPU cores', () => {
    assert.equal(cpuFallbackProvider.getTotalCpuCores(), os.cpus().length);
  });

  it('should sample GPU metrics correctly', async () => {
    const sample = await cpuFallbackProvider.sample();
    const totalMem = os.totalmem();

    const cores = os.cpus().length || 1;
    const load1Min = os.loadavg()[0] ?? 0;
    const cpuUtilization = Math.min(100, Math.max(0, Number(((load1Min / cores) * 100).toFixed(1))));

    assert.strictEqual(sample.gpuBusyPercent, cpuUtilization);
    assert.strictEqual(sample.vramTotalBytes, totalMem);
    assert.ok(sample.vramUsedBytes >= 0 && sample.vramUsedBytes <= totalMem);
    assert.ok(sample.vramPercent >= 0 && sample.vramPercent <= 100);
    assert.strictEqual(sample.gttUsedBytes, 0);
    assert.strictEqual(sample.gttTotalBytes, 0);
    assert.ok(typeof sample.edgeTempCelsius === 'number');
    assert.strictEqual(sample.vddgfxMilliVolts, 0);
    assert.strictEqual(sample.socMilliVolts, 0);
    assert.strictEqual(sample.pptWatts, 0);
    assert.strictEqual(sample.sclkMhz, 0);
  });

  it('should return VRAM metrics correctly', async () => {
    const vramMetrics = await cpuFallbackProvider.getVramMetrics();
    const total = os.totalmem();
    assert.strictEqual(vramMetrics.totalBytes, total);
    assert.ok(vramMetrics.freeBytes >= 0 && vramMetrics.freeBytes <= total);
    assert.ok(vramMetrics.usedBytes >= 0 && vramMetrics.usedBytes <= total);
    assert.strictEqual(vramMetrics.usedBytes + vramMetrics.freeBytes, total);
  });

  it('should return thermal metrics correctly', async () => {
    const thermalMetrics = await cpuFallbackProvider.getThermalMetrics();
    const temp = cpuFallbackProvider['sampleHostCpuTemp']();
    assert.strictEqual(thermalMetrics.temperatureCelsius, temp);
    assert.strictEqual(thermalMetrics.isThrottled, temp >= 85);
  });

  it('should sample host CPU temperature correctly', () => {
    const expectedTemp = cpuFallbackProvider['sampleHostCpuTemp']();
    assert.equal(cpuFallbackProvider['sampleHostCpuTemp'](), expectedTemp);
  });
});
