import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FocusedDiffBuilder } from '../context/FocusedDiffBuilder.js';

describe('FocusedDiffBuilder Indentation Preservation (T96.3.4)', () => {
  const diffBuilder = new FocusedDiffBuilder();

  test('handles multi-line string replacements with exact indentation preservation', () => {
    const original = [
      'class Worker {',
      '  public execute(): void {',
      '    const oldVal = 1;',
      '    return oldVal;',
      '  }',
      '}',
    ].join('\n');

    const modified = [
      'class Worker {',
      '  public execute(): void {',
      '    const newVal = 2;',
      '    const result = newVal * 10;',
      '    return result;',
      '  }',
      '}',
    ].join('\n');

    const chunks = diffBuilder.computeTargetedChunks(original, modified);
    assert.strictEqual(chunks.length, 1);
    const chunk = chunks[0]!;

    // Check that indentation (4 spaces) is strictly preserved in newLines
    assert.strictEqual(chunk.newLines[0], '    const newVal = 2;');
    assert.strictEqual(chunk.newLines[1], '    const result = newVal * 10;');
    assert.strictEqual(chunk.newLines[2], '    return result;');
  });

  test('returns empty array when contents are identical', () => {
    const code = '  const a = 1;\n    const b = 2;';
    const chunks = diffBuilder.computeTargetedChunks(code, code);
    assert.strictEqual(chunks.length, 0);
  });
});
