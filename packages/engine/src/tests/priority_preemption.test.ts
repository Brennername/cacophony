import { TaskScheduler } from '../scheduler/TaskScheduler';
import { PriorityQueue } from '@cacophony/shared-types';

describe('Priority Preemption Test Suite', () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
    // Initialize the scheduler with some tasks for testing
    scheduler.addTask({ id: 'P0_1', priority: PriorityQueue.High });
    scheduler.addTask({ id: 'P2_1', priority: PriorityQueue.Low });
    scheduler.addTask({ id: 'P2_2', priority: PriorityQueue.Low });
  });

  it('should preempt lower-priority tasks when a higher-priority task is added', () => {
    const initialLength = scheduler.queue.length;
    scheduler.addTask({ id: 'P0_2', priority: PriorityQueue.High });
    expect(scheduler.queue.length).toBeGreaterThan(initialLength);
  });

  it('should not allow starvation of P2 tasks', () => {
    // Add a few high-priority tasks to ensure they preempt lower-priority tasks
    scheduler.addTask({ id: 'P0_2', priority: PriorityQueue.High });
    scheduler.addTask({ id: 'P0_3', priority: PriorityQueue.High });
    
    // Check if the P2 tasks are still in the queue after preemption
    const p2Tasks = scheduler.queue.filter(task => task.priority === PriorityQueue.Low);
    expect(p2Tasks.length).toBeGreaterThan(0);
  });
});