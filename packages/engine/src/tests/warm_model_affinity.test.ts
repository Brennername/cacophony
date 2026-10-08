import { describe, it } from 'node:test';

// Mocking dependencies
const mockModelRegistry = {
  getCurrentlyLoadedModels: () => ['model1', 'model2'],
};

const mockTaskScheduler = {
  dispatchTasks: (tasks: any[]) => {
    console.log('Dispatched tasks:', tasks);
  },
};

// Function to be tested
function dispatchTasksWithWarmModelAffinity(tasks: any[], modelRegistry: any, taskScheduler: any) {
  const currentlyLoadedModels = modelRegistry.getCurrentlyLoadedModels();
  const warmTasks = tasks.filter(task => currentlyLoadedModels.includes(task.model));
  const otherTasks = tasks.filter(task => !currentlyLoadedModels.includes(task.model));

  // Dispatch warm tasks first
  taskScheduler.dispatchTasks(warmTasks);
  // Then dispatch other tasks
  taskScheduler.dispatchTasks(otherTasks);
}

// Test suite
describe('dispatchTasksWithWarmModelAffinity', () => {
  it('should dispatch tasks matching the currently loaded model first', async () => {
    const tasks = [
      { id: 1, model: 'model1' },
      { id: 2, model: 'model3' },
      { id: 3, model: 'model2' },
    ];

    await dispatchTasksWithWarmModelAffinity(tasks, mockModelRegistry, mockTaskScheduler);

    // Expected output:
    // Dispatched tasks: [ { id: 1, model: 'model1' }, { id: 3, model: 'model2' } ]
    // Dispatched tasks: [ { id: 2, model: 'model3' } ]
  });

  it('should prevent starvation of tasks not matching the currently loaded model', async () => {
    const tasks = [
      { id: 1, model: 'model4' },
      { id: 2, model: 'model5' },
    ];

    await dispatchTasksWithWarmModelAffinity(tasks, mockModelRegistry, mockTaskScheduler);

    // Expected output:
    // Dispatched tasks: []
    // Dispatched tasks: [ { id: 1, model: 'model4' }, { id: 2, model: 'model5' } ]
  });
});
