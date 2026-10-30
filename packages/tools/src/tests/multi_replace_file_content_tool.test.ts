import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from "node:fs/promises";

import { MultiReplaceFileContentTool, MultiReplaceFileContentParams } from "../implementations/MultiReplaceFileContentTool.js";

describe('MultiReplaceFileContentTool', () => {
  const tool = new MultiReplaceFileContentTool();

  it('should apply multiple replacement chunks atomically', async () => {
    const tempFilePath = './temp_test_file.txt';
    await fs.writeFile(tempFilePath, 'line1\nline2\ntarget\nline4');

    const params: MultiReplaceFileContentParams = {
      path: tempFilePath,
      replacementChunks: [
        { targetContent: 'target', replacementContent: 'replacement' },
        { targetContent: 'line2', replacementContent: 'newLine2' }
      ]
    };

    const result = await tool.execute(params, { workspaceRoot: './' });

    assert.strictEqual(result.success, true);
    assert.strictEqual(await fs.readFile(tempFilePath, 'utf-8'), 'line1\nnewLine2\nreplacement\nline4');

    await fs.unlink(tempFilePath);
  });

  it('should handle startLine and endLine bounds', async () => {
    const tempFilePath = './temp_test_file.txt';
    await fs.writeFile(tempFilePath, 'line1\nline2\ntarget\nline4');

    const params: MultiReplaceFileContentParams = {
      path: tempFilePath,
      replacementChunks: [
        { targetContent: 'target', replacementContent: 'replacement', startLine: 3, endLine: 3 }
      ]
    };

    const result = await tool.execute(params, { workspaceRoot: './' });

    assert.strictEqual(result.success, true);
    assert.strictEqual(await fs.readFile(tempFilePath, 'utf-8'), 'line1\nline2\nreplacement\nline4');

    await fs.unlink(tempFilePath);
  });

  it('should handle ambiguous targetContent', async () => {
    const tempFilePath = './temp_test_file.txt';
    await fs.writeFile(tempFilePath, 'target\ntarget\ntarget');

    const params: MultiReplaceFileContentParams = {
      path: tempFilePath,
      replacementChunks: [
        { targetContent: 'target', replacementContent: 'replacement' }
      ]
    };

    const result = await tool.execute(params, { workspaceRoot: './' });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Chunk #1 targetContent is ambiguous (3 matches found). Narrow with startLine/endLine.');

    await fs.unlink(tempFilePath);
  });

  it('should handle non-existent targetContent', async () => {
    const tempFilePath = './temp_test_file.txt';
    await fs.writeFile(tempFilePath, 'line1\nline2\nline3');

    const params: MultiReplaceFileContentParams = {
      path: tempFilePath,
      replacementChunks: [
        { targetContent: 'nonExistent', replacementContent: 'replacement' }
      ]
    };

    const result = await tool.execute(params, { workspaceRoot: './' });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Chunk #1 targetContent not found in file.');

    await fs.unlink(tempFilePath);
  });
});
