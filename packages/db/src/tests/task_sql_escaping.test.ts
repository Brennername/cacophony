import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SQLiteDriver } from '../drivers/SQLiteDriver.js';
import { MigrationRunner } from '../migrations/MigrationRunner.js';
import { TaskRepository } from '../repositories/TaskRepository.js';
import type { TaskRecord } from '@cacophony/shared-types';

describe('TaskRepository SQL Escaping and Special Characters (T96.5.1)', () => {
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

  test('safely handles prompts with single quotes, double quotes, and semicolons', async () => {
    const maliciousPrompt =
      "Test prompt with 'single quotes', \"double quotes\", and semicolon; DROP TABLE tasks; --";

    const task: TaskRecord = {
      id: 'task-escape-quotes',
      title: "Quotes 'and' \"escapes\"",
      prompt: maliciousPrompt,
      role: 'implementer',
      status: 'PENDING',
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

    const retrieved = await taskRepo.findById('task-escape-quotes');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.prompt, maliciousPrompt);
    assert.strictEqual(retrieved.title, "Quotes 'and' \"escapes\"");

    // Ensure tasks table still exists and query succeeds
    const byTitle = await taskRepo.getByTitle("Quotes 'and' \"escapes\"");
    assert.ok(byTitle);
    const pending = await taskRepo.listPending();
    assert.strictEqual(pending.length, 1);
  });

  test('safely handles backslashes, multiline newlines, and unicode characters in prompt', async () => {
    const complexPrompt =
      'Path: C:\\Users\\test\\project\nMulti-line query:\nSELECT * FROM test WHERE name = \'hello\';\nSpecial chars: <>&"$`\t\\r\\n';

    const task: TaskRecord = {
      id: 'task-escape-unicode',
      title: 'Unicode & Special Chars',
      prompt: complexPrompt,
      role: 'implementer',
      status: 'PENDING',
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

    const retrieved = await taskRepo.findById('task-escape-unicode');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.prompt, complexPrompt);
  });
});
