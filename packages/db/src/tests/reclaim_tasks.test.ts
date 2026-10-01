import { Task } from '@cacophony/db';
import { createTask, getTaskById, updateTask } from '../src/reclaim_tasks';
import { expect } from 'chai';

describe('Reclaim Tasks', () => {
  let task: Task;

  beforeEach(async () => {
    // Create a new task for testing
    task = await createTask({
      name: 'Test Task',
      status: 'RUNNING',
      failureCount: 0,
    });
  });

  afterEach(async () => {
    // Clean up by deleting the task
    if (task) {
      await deleteTask(task.id);
    }
  });

  it('should requeue a RUNNING task with preserved failure count', async () => {
    const initialFailureCount = task.failureCount;

    // Call the function to reclaim the task
    await reclaimTask(task.id);

    // Fetch the updated task from the database
    const updatedTask = await getTaskById(task.id);

    // Assert that the task status is now 'QUEUED'
    expect(updatedTask?.status).to.equal('QUEUED');

    // Assert that the failure count remains unchanged
    expect(updatedTask?.failureCount).to.equal(initialFailureCount);
  });
});