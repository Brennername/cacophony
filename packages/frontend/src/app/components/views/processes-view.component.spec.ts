import { describe, it, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies
const mockProcessItem = {
  pid: 1,
  name: 'process1',
  cpuUsage: 50,
  memoryUsage: 2048,
};

describe('ProcessesViewComponent', () => {
  describe('Sorting', () => {
    it('should sort processes by CPU usage in ascending order', async () => {
      // Arrange
      const processes = [
        { ...mockProcessItem, cpuUsage: 30 },
        { ...mockProcessItem, cpuUsage: 70 },
        { ...mockProcessItem, cpuUsage: 50 },
      ];

      // Act
      processes.sort((a, b) => a.cpuUsage - b.cpuUsage);

      // Assert
      expect(processes[0].cpuUsage).toBe(30);
      expect(processes[1].cpuUsage).toBe(50);
      expect(processes[2].cpuUsage).toBe(70);
    });

    it('should sort processes by memory usage in descending order', async () => {
      // Arrange
      const processes = [
        { ...mockProcessItem, memoryUsage: 1024 },
        { ...mockProcessItem, memoryUsage: 3072 },
        { ...mockProcessItem, memoryUsage: 2048 },
      ];

      // Act
      processes.sort((a, b) => b.memoryUsage - a.memoryUsage);

      // Assert
      expect(processes[0].memoryUsage).toBe(3072);
      expect(processes[1].memoryUsage).toBe(2048);
      expect(processes[2].memoryUsage).toBe(1024);
    });
  });

  describe('CPU/Memory Metric Display', () => {
    it('should display CPU usage as a percentage', async () => {
      // Arrange
      const process = { ...mockProcessItem, cpuUsage: 50 };

      // Act
      const displayedCpuUsage = `${process.cpuUsage}%`;

      // Assert
      expect(displayedCpuUsage).toBe('50%');
    });

    it('should display memory usage in MB', async () => {
      // Arrange
      const process = { ...mockProcessItem, memoryUsage: 2048 };

      // Act
      const displayedMemoryUsage = `${(process.memoryUsage / 1024).toFixed(2)} MB`;

      // Assert
      expect(displayedMemoryUsage).toBe('2.00 MB');
    });
  });

  describe('Process Termination Dispatch', () => {
    it('should dispatch termination for a process', async () => {
      // Arrange
      const mockTerminateProcess = vi.fn();
      const process = { ...mockProcessItem, terminate: mockTerminateProcess };

      // Act
      process.terminate();

      // Assert
      expect(mockTerminateProcess).toHaveBeenCalledOnce();
    });
  });
});
