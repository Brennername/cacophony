import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrFixTaskCoordinator } from '../gitea/PrFixTaskCoordinator.js';
import type { StructuredAssessmentReport } from '@cacophony/shared-types';

describe('T88.6.2: Idempotent CI Failure Queue Enqueuing and Workflow Resumption', () => {
  it('should create exactly one queue item for repeated CI failures on the same commit/round', async () => {
    const createdTasks: any[] = [];
    const taskStore = new Map<string, any>();

    const mockTaskRepo = {
      create: async (task: any) => {
        const record = { id: `task-${createdTasks.length + 1}`, ...task };
        createdTasks.push(record);
        if (task.stageRoundKey) {
          taskStore.set(task.stageRoundKey, record);
        }
        return record;
      },
      findById: async () => null,
      findByStageRoundKey: async (key: string) => taskStore.get(key) || null,
    };

    const coordinator = new PrFixTaskCoordinator(mockTaskRepo as any);
    const report: StructuredAssessmentReport = {
      id: 'rep-ci-1',
      workItemId: 'wi-ci-duplicate-check',
      round: 1,
      headSha: 'deadbeefcafe1234',
      modelIdentity: 'ci-runner',
      verdict: 'REQUEST_CHANGES',
      summary: 'Compilation failure during CI build step',
      findings: [
        {
          id: 'ci-err-1',
          severity: 'critical',
          category: 'correctness',
          path: 'packages/engine/src/index.ts',
          lineNumber: 1,
          ruleId: 'CI_LINT',
          evidence: 'Type error: Cannot find name "Foo"',
          message: 'Compilation failure during CI build step',
        },
      ],
      ciOutcome: 'failure',
      createdAt: new Date().toISOString(),
    };

    const params = {
      workItemId: 'wi-ci-duplicate-check',
      parentTaskId: 'parent-1',
      prNumber: 55,
      prBranch: 'fix/ci-failure-branch',
      targetBranch: 'fix/ci-failure-branch',
      headSha: 'deadbeefcafe1234',
      currentRound: 0,
      report,
    };

    // First failure callback enqueues fix task
    const result1 = await coordinator.enqueueFixTask(params);
    assert.equal(result1.enqueued, true);
    assert.ok(result1.task);
    assert.equal(createdTasks.length, 1);
    assert.equal(result1.task.headSha, 'deadbeefcafe1234');
    assert.equal(result1.task.lineageStage, 'fix');

    // Duplicate callback for same commit/round should return existing task and NOT create a second task
    const result2 = await coordinator.enqueueFixTask(params);
    assert.equal(result2.enqueued, false);
    assert.ok(result2.task);
    assert.equal(createdTasks.length, 1, 'Duplicate CI failure must not create duplicate queue task');
    assert.equal(result1.task.id, result2.task.id);
  });

  it('should retain commit and run evidence and advance stage-round key when head SHA advances', async () => {
    const createdTasks: any[] = [];
    const taskStore = new Map<string, any>();

    const mockTaskRepo = {
      create: async (task: any) => {
        const record = { id: `task-${createdTasks.length + 1}`, ...task };
        createdTasks.push(record);
        if (task.stageRoundKey) {
          taskStore.set(task.stageRoundKey, record);
        }
        return record;
      },
      findById: async () => null,
      findByStageRoundKey: async (key: string) => taskStore.get(key) || null,
    };

    const coordinator = new PrFixTaskCoordinator(mockTaskRepo as any);

    const reportRound1: StructuredAssessmentReport = {
      id: 'rep-r1',
      workItemId: 'wi-ci-advance',
      round: 1,
      headSha: 'aaaa1111',
      modelIdentity: 'ci-runner',
      verdict: 'REQUEST_CHANGES',
      summary: 'Round 1 CI failure',
      findings: [
        {
          id: 'find-1',
          severity: 'high',
          category: 'correctness',
          path: 'packages/db/src/index.ts',
          lineNumber: 12,
          ruleId: 'DB001',
          evidence: 'syntax error',
          message: 'Unterminated string literal',
        },
      ],
      ciOutcome: 'failure',
      createdAt: new Date().toISOString(),
    };

    // Round 1 failure on commit A
    const res1 = await coordinator.enqueueFixTask({
      workItemId: 'wi-ci-advance',
      parentTaskId: 'p-1',
      prNumber: 77,
      prBranch: 'feat/advance',
      targetBranch: 'feat/advance',
      headSha: 'aaaa1111',
      currentRound: 0,
      report: reportRound1,
    });

    assert.equal(res1.enqueued, true);
    assert.ok(res1.task);
    assert.equal(res1.stageRoundKey, 'wi-ci-advance:fix:r1:aaaa1111');

    const reportRound2: StructuredAssessmentReport = {
      id: 'rep-r2',
      workItemId: 'wi-ci-advance',
      round: 2,
      headSha: 'bbbb2222',
      modelIdentity: 'ci-runner',
      verdict: 'REQUEST_CHANGES',
      summary: 'Round 2 CI failure',
      findings: [
        {
          id: 'find-2',
          severity: 'high',
          category: 'correctness',
          path: 'packages/db/src/index.ts',
          lineNumber: 30,
          ruleId: 'DB002',
          evidence: 'assertion failed',
          message: 'Index out of bounds',
        },
      ],
      ciOutcome: 'failure',
      createdAt: new Date().toISOString(),
    };

    // Round 2 failure on commit B (fixer pushed updated code, but a new test failed)
    const res2 = await coordinator.enqueueFixTask({
      workItemId: 'wi-ci-advance',
      parentTaskId: 'p-2',
      prNumber: 77,
      prBranch: 'feat/advance',
      targetBranch: 'feat/advance',
      headSha: 'bbbb2222',
      currentRound: 1,
      report: reportRound2,
    });

    assert.equal(res2.enqueued, true);
    assert.ok(res2.task);
    assert.equal(res2.stageRoundKey, 'wi-ci-advance:fix:r2:bbbb2222');
    assert.equal(createdTasks.length, 2, 'New round with new head SHA must create round 2 fix task');
    assert.equal(res2.task.assessmentRound, 2);
  });
});
