import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRoleSchema } from '../task.js';

describe('AgentRoleSchema', () => {
  const validRoles = [
    'implementer',
    'reviewer',
    'architect',
    'planner',
    'test_engineer',
    'doc_writer',
    'type_specialist',
    'security_auditor',
    'chore_runner',
    'fixer',
    'assessor',
  ];

  it('accepts all canonical agent roles', () => {
    for (const role of validRoles) {
      assert.strictEqual(AgentRoleSchema.parse(role), role);
    }
  });

  it('rejects unknown string identifiers and invalid types', () => {
    const invalidRoles = [
      'product_owner',
      'developer',
      'manager',
      'ADMIN',
      'IMPLEMENTER',
      '',
      123,
      null,
      undefined,
      {},
    ];

    for (const invalid of invalidRoles) {
      const result = AgentRoleSchema.safeParse(invalid);
      assert.strictEqual(
        result.success,
        false,
        `Expected role '${String(invalid)}' to be rejected`,
      );
    }
  });
});
