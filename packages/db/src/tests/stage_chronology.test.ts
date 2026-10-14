import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SQLiteDriver } from '../drivers/SQLiteDriver.js';
import { MigrationRunner } from '../migrations/MigrationRunner.js';
import { TaskRepository } from '../repositories/TaskRepository.js';
import { StageRepository } from '../repositories/StageRepository.js';
import type { TaskRecord, StageName } from '@cacophony/shared-types';

describe('StageRepository Chronological Ordering (T96.5.3)', () => {
  let driver: SQLiteDriver;
  let taskRepo: TaskRepository;
  let stageRepo: StageRepository;

  before(async () => {
    driver = new SQLiteDriver(':memory:');
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    taskRepo = new TaskRepository(driver);
    stageRepo = new StageRepository(driver);
  });

  after(async () => {
    await driver.close();
  });

  test('validates stage span queries return chronological ordering without gaps', async () => {
    const task: TaskRecord = {
      id: 'task-chronology',
      title: 'Chronology Test',
      prompt: 'Verify chronological ordering',
      role: 'implementer',
      status: 'RUNNING',
      priority: 'P1',
      modelAssigned: null,
      testCommand: null,
      focusFiles: null,
      targetBranch: null,
      prUrl: null,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    await taskRepo.create(task);

    const stages: StageName[] = [
      'planning',
      'generation',
      'test_execution',
      'pr_review',
    ];
    const createdIds: number[] = [];

    for (const stage of stages) {
      const id = await stageRepo.recordStageStart(task.id, stage);
      createdIds.push(id);
      await stageRepo.recordStageCompletion(
        id,
        'SUCCESS',
        `Log for ${stage}`,
        100,
        200,
        500,
      );
    }

    const recordedStages = await stageRepo.getStagesForTask(task.id);
    assert.strictEqual(recordedStages.length, 4);

    for (let i = 0; i < recordedStages.length; i++) {
      const stage = recordedStages[i]!;
      assert.strictEqual(stage.id, createdIds[i]);
      assert.strictEqual(stage.stageName, stages[i]);
      assert.strictEqual(stage.stageStatus, 'SUCCESS');
      assert.ok(stage.startedAt);
      assert.ok(stage.completedAt);
      if (i > 0) {
        const prev = recordedStages[i - 1]!;
        assert.ok(
          new Date(stage.startedAt).getTime() >=
            new Date(prev.startedAt).getTime(),
        );
      }
    }
  });
});
