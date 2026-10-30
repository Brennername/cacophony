import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { IncidentBundleRecorder } from '../analytics/IncidentBundleRecorder.js';
import type { RegressionBurstAlert } from '../analytics/FailureClusterDetector.js';

describe('IncidentBundleRecorder', () => {
  let recorder: IncidentBundleRecorder;
  const storageDir = path.join(__dirname, 'test-data');

  before(() => {
    recorder = new IncidentBundleRecorder({ storageDir });
  });

  it('should capture a bundle and save it to disk', async () => {
    const alert: RegressionBurstAlert = {
      alertId: '12345',
      windowSize: 10,
      totalTasksInWindow: 10,
      failureCount: 5,
      distinctModels: ['model1', 'model2'],
      failingTasks: [
        { taskId: 'task1', modelId: 'model1', status: 'FAILED', timestamp: Date.now() },
        { taskId: 'task2', modelId: 'model2', status: 'FAILED', timestamp: Date.now() }
      ],
      timestamp: Date.now(),
      reason: 'test reason'
    };

    const result = await recorder.captureBundle(alert);
    assert.ok(result.bundlePath.includes('incident-'));
    assert.strictEqual(result.bundle.bundleId, `incident-${Date.now()}`);
  });

  it('should retrieve recent git commits', async () => {
    const commits = await recorder.retrieveRecentGitCommits();
    assert.ok(commits.length > 0);
  });

  it('should list all captured bundles', async () => {
    const alert: RegressionBurstAlert = {
      alertId: '12345',
      windowSize: 10,
      totalTasksInWindow: 10,
      failureCount: 5,
      distinctModels: ['model1', 'model2'],
      failingTasks: [
        { taskId: 'task1', modelId: 'model1', status: 'FAILED', timestamp: Date.now() },
        { taskId: 'task2', modelId: 'model2', status: 'FAILED', timestamp: Date.now() }
      ],
      timestamp: Date.now(),
      reason: 'test reason'
    };

    await recorder.captureBundle(alert);
    const bundles = await recorder.listBundles();
    assert.ok(bundles.length > 0);
  });
});
