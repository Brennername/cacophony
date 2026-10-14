import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TaskRecordSchema } from '../task.js';

describe('TaskRecordSchema', () => {
  const validTask = {
    id: 'task-1001',
    title: 'Implement unit tests',
    prompt: 'Implement unit tests adhering to SOLID principles',
    role: 'implementer',
    status: 'PENDING',
    priority: 'P1',
    createdAt: '2026-10-14T00:00:00.000Z',
    updatedAt: '2026-10-14T00:00:00.000Z',
  };

  it('validates a complete and valid task payload', () => {
    const parsed = TaskRecordSchema.parse(validTask);
    assert.strictEqual(parsed.id, 'task-1001');
    assert.strictEqual(parsed.role, 'implementer');
    assert.strictEqual(parsed.status, 'PENDING');
    assert.strictEqual(parsed.priority, 'P1');
    assert.strictEqual(parsed.failureCount, 0);
  });

  it('rejects payloads missing required fields (id, title, prompt, role, status, priority)', () => {
    const missingTitle = { ...validTask };
    delete (missingTitle as any).title;
    const res1 = TaskRecordSchema.safeParse(missingTitle);
    assert.strictEqual(res1.success, false);

    const missingRole = { ...validTask };
    delete (missingRole as any).role;
    const res2 = TaskRecordSchema.safeParse(missingRole);
    assert.strictEqual(res2.success, false);

    const missingStatus = { ...validTask };
    delete (missingStatus as any).status;
    const res3 = TaskRecordSchema.safeParse(missingStatus);
    assert.strictEqual(res3.success, false);

    const missingPriority = { ...validTask };
    delete (missingPriority as any).priority;
    const res4 = TaskRecordSchema.safeParse(missingPriority);
    assert.strictEqual(res4.success, false);
  });

  it('rejects invalid enum values for status and priority', () => {
    const invalidStatus = { ...validTask, status: 'UNKNOWN_STATUS' };
    assert.strictEqual(TaskRecordSchema.safeParse(invalidStatus).success, false);
  });

  it('validates task payload with work-item lineage fields', () => {
    const taskWithLineage = {
      ...validTask,
      role: 'fixer',
      workItemId: 'wi-9988',
      lineageStage: 'fix',
      assessmentRound: 2,
      headSha: 'abc1234def5678',
      stageRoundKey: 'wi-9988:fix:r2:abc1234d',
      findingIds: ['f-1', 'f-2'],
      fixSourceTaskId: 'task-1000',
      lineage: {
        workItemId: 'wi-9988',
        stage: 'fix',
        round: 2,
        headSha: 'abc1234def5678',
        stageRoundKey: 'wi-9988:fix:r2:abc1234d',
        findingIds: ['f-1', 'f-2'],
        fixSourceTaskId: 'task-1000',
      },
    };

    const parsed = TaskRecordSchema.parse(taskWithLineage);
    assert.strictEqual(parsed.role, 'fixer');
    assert.strictEqual(parsed.workItemId, 'wi-9988');
    assert.strictEqual(parsed.lineageStage, 'fix');
    assert.strictEqual(parsed.assessmentRound, 2);
    assert.strictEqual(parsed.headSha, 'abc1234def5678');
    assert.strictEqual(parsed.stageRoundKey, 'wi-9988:fix:r2:abc1234d');
    assert.deepStrictEqual(parsed.findingIds, ['f-1', 'f-2']);
    assert.strictEqual(parsed.fixSourceTaskId, 'task-1000');
    assert.strictEqual(parsed.lineage?.workItemId, 'wi-9988');
  });
});
