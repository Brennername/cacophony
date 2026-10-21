import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { GitRegressionCorrelator } from '../analytics/GitRegressionCorrelator.js';

describe('GitRegressionCorrelator', () => {
  let correlator: GitRegressionCorrelator;

  beforeEach(() => {
    correlator = new GitRegressionCorrelator();
  });

  it('should return commit files for a given hash', async () => {
    const commitHash = 'abc123';
    const expectedFiles = ['file1.js', 'file2.ts'];

    // Mock the runGit method to return expected output
    correlator['runGit'] = (args: readonly string[]): string => {
      if (args.includes(commitHash)) {
        return expectedFiles.join('\n');
      }
      throw new Error('Unexpected git command');
    };

    const files = await correlator.getCommitFiles(commitHash);
    assert.deepStrictEqual(files, expectedFiles);
  });

  it('should handle invalid commit hash', async () => {
    const commitHash = 'invalid';
    const expectedFiles: string[] = [];

    // Mock the runGit method to throw an error for invalid hash
    correlator['runGit'] = (args: readonly string[]): string => {
      if (args.includes(commitHash)) {
        throw new Error('Invalid commit hash');
      }
      throw new Error('Unexpected git command');
    };

    const files = await correlator.getCommitFiles(commitHash);
    assert.deepStrictEqual(files, expectedFiles);
  });
});
