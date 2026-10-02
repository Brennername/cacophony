import { TaskScheduler } from '@cacophony/engine';
import { Test } from 'jest';
import { MockedTask, TaskStatus } from '../mocks/task-mocks';
import { SchedulerWatchdogService } from '@cacophony/engine';

describe('scheduler_watchdog.test.ts', () => {
  let taskScheduler: TaskScheduler;
  let watchdogService: SchedulerWatchdogService;
  let mockTask: MockedTask;

  const createMockTask = (status: TaskStatus): MockedTask => ({
    id: '12345',
    status,
    startTime: new Date(),
    endTime: undefined,
  });

  beforeEach(() => {
    taskScheduler = new TaskScheduler();
    watchdogService = new SchedulerWatchdogService(taskScheduler);
    mockTask = createMockTask(TaskStatus.RUNNING);
  });

  it('should transition task to FAILED when watchdog timeout is triggered', async () => {
    const timeoutMs = 5000; // Simulate a 5-second timeout
    const startTime = new Date();
    const endTime = startTime.getTime() + timeoutMs;

    watchdogService.startWatching(mockTask);

    // Simulate the task taking longer than the timeout
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));

    expect(mockTask.status).toBe(TaskStatus.FAILED);
  });

  it('should not transition task to FAILED if task completes before timeout', async () => {
    const timeoutMs = 5000; // Simulate a 5-second timeout
    const startTime = new Date();
    const endTime = startTime.getTime() + 1000; // Task completes in 1 second

    watchdogService.startWatching(mockTask);

    // Simulate the task completing before the timeout
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(mockTask.status).toBe(TaskStatus.RUNNING);
  });

  it('should handle multiple tasks and only fail the first one that times out', async () => {
    const timeoutMs = 5000;
    const task1 = createMockTask(TaskStatus.RUNNING);
    const task2 = createMockTask(TaskStatus.PENDING);

    watchdogService.startWatching(task1);
    watchdogService.startWatching(task2);

    // Simulate timeout for task1
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));

    expect(task1.status).toBe(TaskStatus.FAILED);
    expect(task2.status).toBe(TaskStatus.PENDING); // Task2 should not be affected
  });

  it('should stop watching when task is completed', async () => {
      const timeoutMs = 5000;
      const startTime = new Date();
      const endTime = startTime.getTime() + 1000;
      mockTask.endTime = endTime;

      watchdogService.startWatching(mockTask);

      // Simulate task completion before timeout
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(mockTask.status).toBe(TaskStatus.COMPLETED);
      expect(watchdogService.isWatching(mockTask)).toBe(false);
  });
});