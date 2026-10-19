import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ReleaseBundlerService } from '../gitea/ReleaseBundlerService.js';

describe('ReleaseBundlerService', () => {
  const service = new ReleaseBundlerService();

  it('should classify a task as feat', () => {
    const task = { id: '123', title: 'feat(auth): Add login' };
    assert.strictEqual(service.classifyTask(task), 'feat');
  });

  it('should classify a task as fix', () => {
    const task = { id: '456', title: 'fix(api): Resolve bug' };
    assert.strictEqual(service.classifyTask(task), 'fix');
  });

  it('should classify a task as refactor', () => {
    const task = { id: '789', title: 'refactor(core): Improve performance' };
    assert.strictEqual(service.classifyTask(task), 'refactor');
  });

  it('should classify a task as docs', () => {
    const task = { id: '101', title: 'docs(readme): Update documentation' };
    assert.strictEqual(service.classifyTask(task), 'docs');
  });

  it('should classify a task as test', () => {
    const task = { id: '112', title: 'test(unit): Add tests for component' };
    assert.strictEqual(service.classifyTask(task), 'test');
  });

  it('should classify a task as chore when no category is specified', () => {
    const task = { id: '131', title: 'Update dependencies' };
    assert.strictEqual(service.classifyTask(task), 'chore');
  });

  it('should identify breaking changes based on title prefix', () => {
    const task = { id: '141', title: 'feat!: Breaking change to API' };
    assert.strictEqual(service.isBreakingChange(task), true);
  });

  it('should identify breaking changes based on description', () => {
    const task = { id: '151', title: 'fix(api): Resolve bug', breakingDescription: 'This change breaks backward compatibility' };
    assert.strictEqual(service.isBreakingChange(task), true);
  });

  it('should compute the next version with a breaking change', () => {
    const tasks = [{ id: '161', title: 'feat!: Breaking change' }];
    assert.strictEqual(service.computeNextVersion('v1.0.0', tasks), '2.0.0');
  });

  it('should compute the next version with a feature', () => {
    const tasks = [{ id: '171', title: 'feat: Add new feature' }];
    assert.strictEqual(service.computeNextVersion('v1.0.0', tasks), '1.1.0');
  });

  it('should compute the next version with a fix', () => {
    const tasks = [{ id: '181', title: 'fix: Resolve bug' }];
    assert.strictEqual(service.computeNextVersion('v1.0.0', tasks), '1.0.1');
  });

  it('should generate a changelog with breaking changes and features', () => {
    const version = '1.2.3';
    const tasks = [
      { id: '191', title: 'feat!: Breaking change' },
      { id: '201', title: 'feat: Add new feature' },
    ];
    const changelog = service.generateChangelog(version, tasks);
    assert(changelog.includes('## Breaking Changes'));
    assert(changelog.includes('- **[191]** feat!: Breaking change'));
    assert(changelog.includes('## Features'));
    assert(changelog.includes('- **[201]** feat: Add new feature'));
  });

  it('should bundle a milestone', () => {
    const options = {
      milestoneTitle: 'Milestone 1',
      previousVersion: 'v1.0.0',
      tasks: [{ id: '211', title: 'feat: Add new feature' }],
    };
    const bundle = service.bundleMilestone(options);
    assert.strictEqual(bundle.milestoneTitle, 'Milestone 1');
    assert.strictEqual(bundle.releaseBranch, 'release/v1.1.0');
  });

  it('should bump version with a breaking change', () => {
    const tasks = [{ id: '221', title: 'feat!: Breaking change' }];
    assert.strictEqual(service.bumpVersion('v1.0.0', tasks), '2.0.0');
  });

  it('should bump version with a feature', () => {
    const tasks = [{ id: '231', title: 'feat: Add new feature' }];
    assert.strictEqual(service.bumpVersion('v1.0.0', tasks), '1.1.0');
  });

  it('should bump version with a fix', () => {
    const tasks = [{ id: '241', title: 'fix: Resolve bug' }];
    assert.strictEqual(service.bumpVersion('v1.0.0', tasks), '1.0.1');
  });
});
