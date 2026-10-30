import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { MultiFileEditCoordinator } from '../context/MultiFileEditCoordinator.js';

describe('MultiFileEditCoordinator', () => {
  let coordinator: MultiFileEditCoordinator;
  const workspaceRoot = path.resolve(__dirname, '../../..');

  before(() => {
    coordinator = new MultiFileEditCoordinator();
  });

  afterEach(async () => {
    await coordinator.discard();
  });

  it('should stage a file with proposed content', async () => {
    const relativePath = 'test/file.ts';
    const proposedContent = 'console.log("Hello, world!");';
    await coordinator.stage(workspaceRoot, relativePath, proposedContent);
    assert.deepEqual(coordinator['staged'].get(relativePath), {
      relativePath,
      originalContent: '',
      proposedContent,
    });
  });

  it('should validate staged files and return errors if any', async () => {
    const file1 = 'test/file1.ts';
    const file2 = 'test/file2.js';
    await coordinator.stage(workspaceRoot, file1, 'console.log("Hello, world!");');
    await coordinator.stage(workspaceRoot, file2, 'console.log("Hello, world!");');
    const validationResult = coordinator.validateStaged();
    assert.strictEqual(validationResult.valid, true);
    assert.deepEqual(validationResult.errors, []);
  });

  it('should throw an error if staged files are invalid', async () => {
    await coordinator.stage(workspaceRoot, 'test/invalidFile.ts', 'console.log("Invalid syntax');
    const validationFn = () => coordinator.validateStaged();
    assert.throws(validationFn, /Cannot commit staged edits to disk due to validation errors/);
  });

  it('should apply valid staged files to disk and clear the staging area', async () => {
    const file1 = 'test/file1.ts';
    await coordinator.stage(workspaceRoot, file1, 'console.log("Hello, world!");');
    const appliedFiles = await coordinator.applyToDisk(workspaceRoot);
    assert.deepEqual(appliedFiles, [file1]);
    const fullPath = path.resolve(workspaceRoot, file1);
    const content = await fs.readFile(fullPath, 'utf-8');
    assert.strictEqual(content, 'console.log("Hello, world!");');
  });
});