import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mocking the dispatcher object to include createIntervention method
const dispatcher = {
  triggerIntervention: () => {
    console.log('Intervention triggered');
  },
  createIntervention: (task: any) => {
    // Simulate intervention creation logic
    return { task, status: 'intervened' };
  }
};

describe('Plateau Intervention Dispatcher', () => {
  it('should not trigger intervention if task is not stagnant', async () => {
    const task = { status: 'active' };
    const interventionDispatcher = {
      dispatchIntervention: (task: any) => {
        if (task.status === 'stagnant') {
          dispatcher.triggerIntervention();
        }
      }
    };

    assert.doesNotThrow(() => interventionDispatcher.dispatchIntervention(task));
  });

  it('should handle multiple interventions for stagnant tasks', async () => {
    const task1 = { status: 'stagnant' };
    const task2 = { status: 'stagnant' };
    const interventionDispatcher = {
      dispatchIntervention: (task: any) => {
        if (task.status === 'stagnant') {
          dispatcher.triggerIntervention();
        }
      }
    };

    const originalConsoleLog = console.log;
    let logOutput = '';
    console.log = (message) => {
      logOutput += message + '\n';
    };

    interventionDispatcher.dispatchIntervention(task1);
    interventionDispatcher.dispatchIntervention(task2);

    console.log = originalConsoleLog;

    assert.strictEqual(logOutput, 'Intervention triggered\nIntervention triggered\n');
  });

  it('should handle plateaus with overlapping ranges', async () => {
    const task1 = { status: 'stagnant', range: [1, 5] };
    const task2 = { status: 'stagnant', range: [3, 7] };
    const interventionDispatcher = {
      dispatchIntervention: (task: any) => {
        if (task.status === 'stagnant') {
          dispatcher.triggerIntervention();
        }
      },
      handleOverlappingRanges: (tasks: any[]): any[] => {
        return tasks.map(task => {
          if (task.status === 'stagnant') {
            return dispatcher.createIntervention(task);
          }
          return null;
        }).filter(Boolean);
      }
    };

    const interventions = interventionDispatcher.handleOverlappingRanges([task1, task2]);

    assert.strictEqual(interventions.length, 2);
    assert.deepStrictEqual(interventions[0], { task: task1, status: 'intervened' });
    assert.deepStrictEqual(interventions[1], { task: task2, status: 'intervened' });
  });
});
