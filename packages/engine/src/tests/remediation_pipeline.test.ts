import { Task, TaskStatus } from '@cacophony/shared-types';
import { RemediationPipeline } from '../remediation_pipeline';

describe('Remediation Pipeline', () => {
  let pipeline: RemediationPipeline;

  beforeEach(() => {
    pipeline = new RemediationPipeline();
  });

  it('should advance task to REMEDIATING status when failing test', async () => {
    // Arrange
    const task: Task = {
      id: '123',
      status: TaskStatus.PENDING,
      tests: [
        { name: 'test1', result: false },
        { name: 'test2', result: true }
      ]
    };

    // Act
    await pipeline.processTask(task);

    // Assert
    expect(task.status).toBe(TaskStatus.REMEDIATING);
  });
});