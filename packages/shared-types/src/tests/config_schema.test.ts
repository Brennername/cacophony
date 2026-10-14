import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CacophonySystemConfigSchema } from '../config.js';

describe('CacophonySystemConfigSchema', () => {
  const baseValidConfig = {
    role_models: {
      planner: 'qwen2.5-coder:7b',
      architect: 'qwen2.5-coder:14b',
      implementer: 'qwen2.5-coder:7b',
      reviewer: 'qwen2.5-coder:7b',
      test_engineer: 'qwen2.5-coder:7b',
    },
    candidate_models: ['qwen2.5-coder:7b', 'deepseek-r1:8b'],
    execution_guards: {
      blacklisted_commands: ['rm -rf /'],
    },
    directives: ['No emojis', 'Strict typing'],
  };

  it('should enforce default execution mode "auto"', () => {
    const parsed = CacophonySystemConfigSchema.parse(baseValidConfig);
    assert.strictEqual(parsed.execution_mode, 'auto');
    assert.strictEqual(parsed.concurrency_limit, 1);
  });

  it('should enforce positive concurrency', () => {
    const parsed = CacophonySystemConfigSchema.parse({
      ...baseValidConfig,
      concurrency_limit: 5,
    });
    assert.strictEqual(parsed.concurrency_limit, 5);

    const negativeResult = CacophonySystemConfigSchema.safeParse({
      ...baseValidConfig,
      concurrency_limit: -1,
    });
    assert.strictEqual(negativeResult.success, false);

    const zeroResult = CacophonySystemConfigSchema.safeParse({
      ...baseValidConfig,
      concurrency_limit: 0,
    });
    assert.strictEqual(zeroResult.success, false);
  });
});
