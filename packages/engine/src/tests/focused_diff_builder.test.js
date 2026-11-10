import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { FocusedDiffBuilder } from '../context/FocusedDiffBuilder.js';

describe('FocusedDiffBuilder', () => {
  const builder = new FocusedDiffBuilder();

  it('should compute targeted chunks for identical files', () => {
    const originalContent = `line1\nline2\nline3`;
    const modifiedContent = `line1\nline2\nline3`;

    const chunks = builder.computeTargetedChunks(originalContent, modifiedContent);
    assert.strictEqual(chunks.length, 0, 'Expected no changes for identical files');
  });

  it('should compute targeted chunks for completely different files', () => {
    const originalContent = `line1\nline2\nline3`;
    const modifiedContent = `newLine1\nnewLine2\nnewLine3`;

    const chunks = builder.computeTargetedChunks(originalContent, modifiedContent);
    assert.strictEqual(chunks.length, 1, 'Expected one chunk for completely different files');
    assert.deepStrictEqual(chunks[0], {
      oldStartLine: 1,
      oldLineCount: 3,
      newStartLine: 1,
      newLineCount: 3,
      oldLines: ['line1', 'line2', 'line3'],
      newLines: ['newLine1', 'newLine2', 'newLine3']
    }, 'Expected correct chunk details for completely different files');
  });

  it('should compute targeted chunks with some lines unchanged and some changed', () => {
    const originalContent = `line1\nline2\nline3`;
    const modifiedContent = `line1\nmodifiedLine2\nline3`;

    const chunks = builder.computeTargetedChunks(originalContent, modifiedContent);
    assert.strictEqual(chunks.length, 1, 'Expected one chunk for partially changed files');
    assert.deepStrictEqual(chunks[0], {
      oldStartLine: 2,
      oldLineCount: 1,
      newStartLine: 2,
      newLineCount: 1,
      oldLines: ['line2'],
      newLines: ['modifiedLine2']
    }, 'Expected correct chunk details for partially changed files');
  });

  it('should build a unified diff string', () => {
    const originalContent = `line1\nline2\nline3`;
    const modifiedContent = `newLine1\nline2\nnewLine3`;

    const diffString = builder.build(originalContent, modifiedContent);
    assert.match(diffString, /^--- a\/file\.txt\n\+\+\+ b\/file\.txt\n@@ -1,3 \+1,3 @@/s, 'Expected correct unified diff header');
    assert.match(diffString, /-line1\n\+newLine1/s, 'Expected correct line changes in unified diff');
  });

  it('should build a structured diff object', () => {
    const originalContent = `line1\nline2\nline3`;
    const modifiedContent = `newLine1\nline2\nnewLine3`;

    const diff = builder.buildStructuredDiff('file.txt', originalContent, modifiedContent);
    assert.strictEqual(diff.filePath, 'file.txt', 'Expected correct file path in structured diff');
    assert.strictEqual(diff.additions, 2, 'Expected correct number of additions');
    assert.strictEqual(diff.deletions, 2, 'Expected correct number of deletions');
    assert.deepStrictEqual(diff.hunks[0], {
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 3,
      lines: ['-line1', '+newLine1', ' line2', ' line3', '+newLine3']
    }, 'Expected correct hunk details in structured diff');
  });

  it('should build a simple diff array for line-by-line comparison', () => {
    const originalLines = ['line1', 'line2', 'line3'];
    const modifiedLines = ['line1', 'modifiedLine2', 'line3'];

    const diffArray = builder.buildDiff(originalLines, modifiedLines);
    assert.deepStrictEqual(diffArray, [
      '  line1',
      '- line2',
      '+ modifiedLine2',
      '  line3'
    ], 'Expected correct line-by-line diff array');
  });
});