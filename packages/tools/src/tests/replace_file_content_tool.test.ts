import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from "node:fs/promises";

import { ReplaceFileContentTool } from "../implementations/ReplaceFileContentTool.js";

describe('ReplaceFileContentTool', () => {
  const tool = new ReplaceFileContentTool();

  it('should replace content in a single chunk without line bounds', async () => {
    const tempFilePath = 'temp.txt';
    await fs.writeFile(tempFilePath, 'old content');

    const params = {
      path: tempFilePath,
      targetContent: 'old',
      replacementContent: 'new'
    };

    const result = await tool.execute(params, { workspaceRoot: '.' });

    assert.strictEqual(result.success, true);
    assert.strictEqual(await fs.readFile(tempFilePath, 'utf-8'), 'new content');
    await fs.unlink(tempFilePath);
  });

  it('should replace content in a single chunk with line bounds', async () => {
    const tempFilePath = 'temp.txt';
    await fs.writeFile(tempFilePath, 'line1\nold\nline3');

    const params = {
      path: tempFilePath,
      targetContent: 'old',
      replacementContent: 'new',
      startLine: 2,
      endLine: 2
    };

    const result = await tool.execute(params, { workspaceRoot: '.' });

    assert.strictEqual(result.success, true);
    assert.strictEqual(await fs.readFile(tempFilePath, 'utf-8'), 'line1\nnew\nline3');
    await fs.unlink(tempFilePath);
  });

  it('should handle target content not found', async () => {
    const tempFilePath = 'temp.txt';
    await fs.writeFile(tempFilePath, 'content');

    const params = {
      path: tempFilePath,
      targetContent: 'missing',
      replacementContent: 'new'
    };

    const result = await tool.execute(params, { workspaceRoot: '.' });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Target content not found in temp.txt.');
    await fs.unlink(tempFilePath);
  });

  it('should handle target content not unique', async () => {
    const tempFilePath = 'temp.txt';
    await fs.writeFile(tempFilePath, 'old\nold');

    const params = {
      path: tempFilePath,
      targetContent: 'old',
      replacementContent: 'new'
    };

    const result = await tool.execute(params, { workspaceRoot: '.' });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Target content occurs 2 times in temp.txt. Provide startLine/endLine bounds or additional context to uniquely identify it.');
    await fs.unlink(tempFilePath);
  });

  it('should handle line bounds out of file bounds', async () => {
    const tempFilePath = 'temp.txt';
    await fs.writeFile(tempFilePath, 'content');

    const params = {
      path: tempFilePath,
      targetContent: 'old',
      replacementContent: 'new',
      startLine: 2,
      endLine: 3
    };

    const result = await tool.execute(params, { workspaceRoot: '.' });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Specified startLine 2 is out of file bounds (total lines: 1).');
    await fs.unlink(tempFilePath);
  });
});
