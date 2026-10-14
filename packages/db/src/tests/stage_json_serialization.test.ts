import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SQLiteDriver } from '../drivers/SQLiteDriver.js';
import { MigrationRunner } from '../migrations/MigrationRunner.js';
import { TaskRepository } from '../repositories/TaskRepository.js';
import type { TaskRecord } from '@cacophony/shared-types';

describe('TaskRepository Stage JSON Serialization (T96.5.2)', () => {
  let driver: SQLiteDriver;
  let taskRepo: TaskRepository;

  before(async () => {
    driver = new SQLiteDriver(':memory:');
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();
    taskRepo = new TaskRepository(driver);
  });

  after(async () => {
    await driver.close();
  });

  test('correctly serializes complex JSON artifacts with special symbols into log_snippet', async () => {
    const task: TaskRecord = {
      id: 'task-stage-serialize',
      title: 'Stage Serialization Test',
      prompt: 'Testing stage state JSON updates',
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

    const complexArtifacts = {
      html: '<html><body>&amp; "escaped" \'single\'</body></html>',
      symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      filepath: 'C:\\Users\\Workspace\\node_modules\\.cache\\file.ts',
      nested: {
        success: true,
        exitCode: 0,
      },
    };

    await taskRepo.updateStageState(
      'task-stage-serialize',
      'deterministic_scrub',
      'COMPLETED',
      complexArtifacts,
    );

    const updated = await taskRepo.findById('task-stage-serialize');
    assert.ok(updated);
    assert.ok(updated.logSnippet);
    assert.ok(updated.logSnippet.includes('[Stage deterministic_scrub: COMPLETED]'));
    assert.ok(updated.logSnippet.includes('html'));
    assert.ok(updated.logSnippet.includes('&amp;'));
    assert.ok(updated.logSnippet.includes('\\\\Users\\\\Workspace'));
  });

  test('handles updateStageState without artifacts cleanly', async () => {
    await taskRepo.updateStageState(
      'task-stage-serialize',
      'test_execution',
      'RUNNING',
    );

    const updated = await taskRepo.findById('task-stage-serialize');
    assert.ok(updated);

    assert.ok(updated.logSnippet);
  });
});
