import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CacophonySystemConfigSchema } from '@cacophony/shared-types';

describe('CacophonySystemConfigSchema', () => {
  it('should enforce default execution mode "auto"', () => {
    const config = {};
    const validationResult = (CacophonySystemConfigSchema as any).validate(config);
    assert.strictEqual(validationResult.value.executionMode, 'auto');
  });

  it('should enforce positive concurrency', () => {
    const config = { executionMode: 'auto', concurrency: 5 };
    const validationResult = (CacophonySystemConfigSchema as any).validate(config);
    assert.strictEqual(validationResult.value.concurrency, 5);
  });
});
