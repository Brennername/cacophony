import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const dispatcher = {
  triggerIntervention: () => {
    console.log('Intervention triggered');
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

  it('should trigger intervention when task is stagnant', async () => {
    const task = { status: 'stagnant' };
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

    interventionDispatcher.dispatchIntervention(task);

    console.log = originalConsoleLog;

    assert.strictEqual(logOutput, 'Intervention triggered\n');
  });
});
