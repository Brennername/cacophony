import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// CpuFallbackProvider.ts

/**
 * Provides CPU fallback provider computing memory and CPU core utilization via Node.js `os` module when no accelerator is present.
 */
export class CpuFallbackProvider {
  /**
   * Retrieves the total amount of system memory in bytes.
   * @returns The total system memory in bytes.
   */
  getTotalMemory(): number {
    return require('os').totalmem();
  }

  /**
   * Retrieves the amount of free system memory in bytes.
   * @returns The amount of free system memory in bytes.
   */
  getFreeMemory(): number {
    return require('os').freemem();
  }

  /**
   * Retrieves the total number of CPU cores available on the system.
   * @returns The total number of CPU cores.
   */
  getTotalCpuCores(): number {
    return require('os').cpus().length;
  }
}

// Unit tests for CpuFallbackProvider
describe('CpuFallbackProvider', () => {
  it('should provide total memory', async () => {
    const provider = new CpuFallbackProvider();
    const totalMemory = provider.getTotalMemory();
    assert(totalMemory > 0, 'Total memory should be greater than zero');
  });

  it('should provide free memory', async () => {
    const provider = new CpuFallbackProvider();
    const freeMemory = provider.getFreeMemory();
    assert(freeMemory >= 0, 'Free memory should be non-negative');
  });

  it('should provide total CPU cores', async () => {
    const provider = new CpuFallbackProvider();
    const totalCores = provider.getTotalCpuCores();
    assert(totalCores > 0, 'Total CPU cores should be greater than zero');
  });
});
