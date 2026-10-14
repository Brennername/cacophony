import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ImportPruningEngine } from '../context/ImportPruningEngine.js';

describe('ImportPruningEngine Type-Only vs Value Imports (T96.3.3)', () => {
  const engine = new ImportPruningEngine();

  test('preserves used type-only imports and removes unused imports', () => {
    const code = `import type { TaskRecord, AgentRole } from 'external-types';
import { UnusedHelper } from 'external-utils';
import { Logger } from 'external-logger';

export function runTask(task: TaskRecord): void {
  Logger.info(task.id);
}
`;

    const pruned = engine.pruneUnusedImports(code);
    assert.ok(pruned.includes('TaskRecord'));
    assert.ok(pruned.includes('Logger'));
    assert.strictEqual(pruned.includes('UnusedHelper'), false);
  });

  test('preserves local relative imports even when not explicitly allowed', () => {
    const code = `import { localFunc } from './localModule.js';
import { UnusedThirdParty } from 'unused-library';

export const x = 10;
`;

    const pruned = engine.pruneUnusedImports(code);
    assert.ok(pruned.includes('./localModule.js'));
    assert.strictEqual(pruned.includes('UnusedThirdParty'), false);
  });
});
