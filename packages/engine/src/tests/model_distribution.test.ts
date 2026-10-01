import { strict as assert } from 'assert';
import { TaskScheduler } from '../scheduler/TaskScheduler';
import { ModelRegistry } from '../model/ModelRegistry';

describe('Model Distribution Test Suite', () => {
  let taskScheduler: TaskScheduler;
  let modelRegistry: ModelRegistry;

  beforeEach(() => {
    // Initialize the TaskScheduler and ModelRegistry
    taskScheduler = new TaskScheduler();
    modelRegistry = new ModelRegistry();

    // Register three distinct model IDs
    modelRegistry.registerModel('model1');
    modelRegistry.registerModel('model2');
    modelRegistry.registerModel('model3');
  });

  afterEach(() => {
    // Clean up any resources if needed
  });

  it('should distribute 20 consecutive queued tasks balanced across 3 distinct registered model IDs', async () => {
    const numTasks = 20;
    const expectedTasksPerModel = Math.floor(numTasks / modelRegistry.getRegisteredModels().length);

    for (let i = 0; i < numTasks; i++) {
      taskScheduler.queueTask({ modelId: 'model1' });
    }

    // Check the distribution of tasks
    assert.strictEqual(taskScheduler.getQueuedTasksForModel('model1').length, expectedTasksPerModel);
    assert.strictEqual(taskScheduler.getQueuedTasksForModel('model2').length, expectedTasksPerModel);
    assert.strictEqual(taskScheduler.getQueuedTasksForModel('model3').length, expectedTasksPerModel);

    // If there is a remainder, it should be distributed among the models
    if (numTasks % modelRegistry.getRegisteredModels().length !== 0) {
      assert.ok(
        taskScheduler.getQueuedTasksForModel('model1').length === expectedTasksPerModel + 1 ||
          taskScheduler.getQueuedTasksForModel('model2').length === expectedTasksPerModel + 1 ||
          taskScheduler.getQueuedTasksForModel('model3').length === expectedTasksPerModel + 1
      );
    }
  });
});