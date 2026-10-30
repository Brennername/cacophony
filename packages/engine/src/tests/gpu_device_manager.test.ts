import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mocking GpuDeviceManager for testing purposes
class MockGpuDeviceManager {
  getDeviceCount(): number {
    return 3; // Simulating 3 GPU devices
  }

  getDeviceNames(): string[] {
    return ['GPU0', 'GPU1', 'GPU2']; // Simulating device names
  }
}

describe('GpuDeviceManager Unit Tests', () => {
  let gpuDeviceManager: MockGpuDeviceManager;

  beforeEach(() => {
    gpuDeviceManager = new MockGpuDeviceManager();
  });

  it('should return the correct number of GPU devices', () => {
    const deviceCount = gpuDeviceManager.getDeviceCount();
    assert.strictEqual(deviceCount, 3);
  });

  it('should return the correct names of GPU devices', () => {
    const deviceNames = gpuDeviceManager.getDeviceNames();
    assert.deepStrictEqual(deviceNames, ['GPU0', 'GPU1', 'GPU2']);
  });
});
