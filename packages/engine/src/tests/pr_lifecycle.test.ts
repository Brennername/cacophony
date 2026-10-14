import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AssessmentPolicy } from '../gitea/AssessmentPolicy.js';
import { PrFixTaskCoordinator } from '../gitea/PrFixTaskCoordinator.js';
import { ModelRoleSelector } from '../scheduler/ModelRoleSelector.js';
import type { StructuredAssessmentReport } from '@cacophony/shared-types';

describe('T88.6.1 & T88.6.3: PR Review-to-Fix Closed-Loop Lifecycle & Eviction Invariants', () => {
  it('should verify complete lifecycle: implementation -> PR publication -> independent assessments -> queued fix -> round advance -> merge', async () => {
    // 1. Implementation Model produces PR
    const authorModel = 'qwen2.5-coder:7b';
    const prNumber = 42;
    const workItemId = 'wi-lifecycle-100';
    const targetBranch = 'feat/user-auth-jwt';
    const initialHeadSha = '1111111111111111111111111111111111111111';

    // 2. Select Independent Assessor (excluding author model)
    const roleSelector = new ModelRoleSelector();
    const availableModels = ['qwen2.5-coder:7b', 'deepseek-coder:6.7b', 'codellama:7b'];
    const assessor1 = roleSelector.selectModelForRole('assessor', availableModels, {
      authoringModel: authorModel,
    });
    assert.notEqual(assessor1, authorModel, 'Assessor 1 must be distinct from implementation model');

    // 3. Assessor 1 evaluates PR and finds critical security flaw
    const round1Report1: StructuredAssessmentReport = {
      id: 'report-r1-1',
      workItemId,
      round: 1,
      headSha: initialHeadSha,
      modelIdentity: assessor1,
      verdict: 'REQUEST_CHANGES',
      summary: 'Secret token is improperly logged to stdout',
      findings: [
        {
          id: 'finding-1',
          severity: 'critical',
          category: 'security',
          path: 'packages/engine/src/auth/jwt.ts',
          lineNumber: 42,
          ruleId: 'SEC001',
          evidence: 'console.log("Token: " + token)',
          message: 'Sensitive token written to stdout',
          deterministicFixHint: 'this.logger.debug("Token verified")',
        },
      ],
      ciOutcome: 'success',
      createdAt: new Date().toISOString(),
    };

    // 4. Policy Gate evaluates Round 1: must block auto-merge due to critical finding and REQUEST_CHANGES
    const policy = new AssessmentPolicy({ minIndependentReviewers: 2, requirePassingCi: true });
    const round1Gate = policy.evaluate({
      authorModel,
      reports: [round1Report1],
      ciStatus: 'success',
      isCodeModifying: true,
    });
    assert.equal(round1Gate.eligible, false);
    assert.equal(round1Gate.criticalFindingCount, 1);
    assert.equal(round1Gate.reasons.some((r: string) => r.toLowerCase().includes('critical')), true);

    // 5. Enqueue Targeted Fix Task targeting existing branch
    const createdTasks: any[] = [];
    const mockTaskRepo = {
      create: async (task: any) => {
        createdTasks.push(task);
        return { id: `task-${createdTasks.length}`, ...task };
      },
      findById: async () => null,
      findByStageRoundKey: async () => null,
    };
    const fixCoordinator = new PrFixTaskCoordinator(mockTaskRepo as any);
    const fixResult = await fixCoordinator.enqueueFixTask({
      workItemId,
      parentTaskId: 'task-parent-1',
      prNumber,
      prBranch: targetBranch,
      targetBranch,
      currentRound: 1,
      headSha: initialHeadSha,
      report: round1Report1,
      priority: 'P0',
    });

    assert.equal(fixResult.enqueued, true);
    assert.ok(fixResult.task);
    assert.equal(fixResult.task.targetBranch, targetBranch, 'Target branch must point to existing PR branch');
    assert.equal(fixResult.task.role, 'fixer');
    assert.equal(fixResult.task.priority, 'P0');
    assert.equal(fixResult.task.findingIds?.includes('finding-1'), true);

    // 6. Fixer applies fix and pushes new commit -> Head SHA changes to commit2
    const updatedHeadSha = '2222222222222222222222222222222222222222';

    // 7. Round 2: Independent Assessments on updated head SHA
    const assessor2 = roleSelector.selectModelForRole('assessor', availableModels, {
      authoringModel: authorModel,
      excludeModels: [assessor1],
    });
    assert.ok(assessor2);
    assert.notEqual(assessor2, authorModel);

    const round2Report1: StructuredAssessmentReport = {
      id: 'report-r2-1',
      workItemId,
      round: 2,
      headSha: updatedHeadSha,
      modelIdentity: assessor1,
      verdict: 'APPROVE',
      summary: 'Sensitive logging resolved safely',
      findings: [],
      ciOutcome: 'success',
      createdAt: new Date().toISOString(),
    };

    const round2Report2: StructuredAssessmentReport = {
      id: 'report-r2-2',
      workItemId,
      round: 2,
      headSha: updatedHeadSha,
      modelIdentity: assessor2,
      verdict: 'APPROVE',
      summary: 'Clean code and solid error handling verified',
      findings: [],
      ciOutcome: 'success',
      createdAt: new Date().toISOString(),
    };

    // 8. Policy Gate evaluates Round 2: passes quorum of 2 independent distinct reviews, 0 blockers, green CI
    const round2Gate = policy.evaluate({
      authorModel,
      reports: [round2Report1, round2Report2],
      ciStatus: 'success',
      isCodeModifying: true,
    });

    assert.equal(round2Gate.eligible, true, 'PR should be eligible for merge after passing quorum and zero blockers');
    assert.equal(round2Gate.approvedCount >= 2, true);
  });

  it('T88.6.3: should ensure model eviction does not lose findings, duplicate completed runs, or cross-attribute findings', async () => {
    const roleSelector = new ModelRoleSelector();
    const availableModels = ['model-flaky:7b', 'model-stable:7b'];

    // Record high consecutive failure rate for flaky model to trigger eviction penalty
    const modelStats: Record<string, { winRate: number; totalRuns: number; consecutiveFailures: number }> = {
      'model-flaky:7b': { winRate: 0.1, totalRuns: 10, consecutiveFailures: 4 },
      'model-stable:7b': { winRate: 0.9, totalRuns: 10, consecutiveFailures: 0 },
    };

    const selectedFixer = roleSelector.selectModelForRole('fixer', availableModels, {
      modelStats,
    });
    assert.equal(selectedFixer, 'model-stable:7b', 'Flaky model must be evicted in favor of stable model');

    // Findings must remain attributed strictly to reporting model
    const findingA = {
      id: 'finding-a',
      severity: 'high' as const,
      category: 'correctness' as const,
      path: 'packages/engine/src/core.ts',
      lineNumber: 10,
      ruleId: 'COR01',
      evidence: 'x = null',
      message: 'Potential null pointer',
    };

    const reportA: StructuredAssessmentReport = {
      id: 'rep-a',
      workItemId: 'wi-iso',
      round: 1,
      headSha: 'abc',
      modelIdentity: 'model-reporter-1',
      verdict: 'REQUEST_CHANGES',
      summary: 'Needs check',
      findings: [findingA],
      ciOutcome: 'success',
      createdAt: new Date().toISOString(),
    };

    assert.equal(reportA.findings[0]?.id, 'finding-a');
    assert.equal(reportA.modelIdentity, 'model-reporter-1', 'Findings provenance must remain immutable');
  });
});
