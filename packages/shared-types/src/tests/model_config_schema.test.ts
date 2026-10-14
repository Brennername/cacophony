import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ModelManagementConfigSchema } from '../config.js';

describe('ModelManagementConfigSchema', () => {
  it('should have default values for protected models', () => {
    const config = ModelManagementConfigSchema.parse({});
    assert.deepStrictEqual(config.protectedModels, [
      'deepseek-r1:8b-4k',
      'qwen2.5-coder:7b-instruct-q4_K_M',
    ]);
    assert.strictEqual(config.managedModelsEnabled, true);
    assert.strictEqual(config.autoEvictionEnabled, true);
  });

  it('should have default storage quotas and enforce positive limit', () => {
    const config = ModelManagementConfigSchema.parse({});
    assert.strictEqual(config.maxDiskStorageGb, 50);

    const invalidResult = ModelManagementConfigSchema.safeParse({
      maxDiskStorageGb: -10,
    });
    assert.strictEqual(invalidResult.success, false);

    const customConfig = ModelManagementConfigSchema.parse({
      maxDiskStorageGb: 120,
    });
    assert.strictEqual(customConfig.maxDiskStorageGb, 120);
  });
});