import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ModelManagementConfigSchema } from '../config.js';

describe('ModelManagementConfigSchema', () => {
  it('should have default values for protected models', async () => {
    const config = ModelManagementConfigSchema.parse({});
    assert.strictEqual(config.protectedModels, ['model1', 'model2']);
  });

  it('should have default storage quotas', async () => {
    const config = ModelManagementConfigSchema.parse({});
    assert.strictEqual((config as any).storageQuotas.default, 100);
    assert.strictEqual((config as any).storageQuotas.protected, 500);
  });
});