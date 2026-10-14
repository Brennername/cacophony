import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PrFixTaskCoordinator } from "../gitea/PrFixTaskCoordinator.js";
import type { TaskRepository } from "@cacophony/db";
import type { StructuredAssessmentReport, TaskRecord } from "@cacophony/shared-types";

describe("T88.4: PrFixTaskCoordinator Targeted PR Remediation", () => {
  const dummyReport: StructuredAssessmentReport = {
    id: "rep-fix-1",
    workItemId: "wi-8840",
    round: 1,
    prId: 55,
    headSha: "head12345678",
    modelIdentity: "deepseek-r1:8b",
    verdict: "REQUEST_CHANGES",
    summary: "Validation defect found",
    findings: [
      {
        id: "find-101",
        category: "correctness",
        severity: "critical",
        path: "src/services/AuthService.ts",
        lineNumber: 120,
        message: "Unchecked null pointer in user session lookup",
        deterministicFixHint: "const user = session?.user; if (!user) return null;",
        rationale: "Prevents runtime unhandled exception",
      },
    ],
    ciOutcome: "success",
    createdAt: new Date().toISOString(),
  };

  test("T88.4.2 & T88.4.3: should enqueue targeted fix task targeting the existing PR branch", async () => {
    let createdPayload: any = null;
    const existingMap = new Map<string, TaskRecord>();

    const mockTaskRepo: Partial<TaskRepository> = {
      findByStageRoundKey: async (key: string) => existingMap.get(key) ?? null,
      create: async (dto: any) => {
        createdPayload = dto;
        const task: TaskRecord = {
          id: "task-fix-001",
          title: dto.title,
          prompt: dto.prompt,
          role: dto.role,
          priority: dto.priority,
          status: "PENDING",
          modelAssigned: null,
          testCommand: null,
          prUrl: null,
          completedAt: null,
          focusFiles: dto.focusFiles,
          targetBranch: dto.targetBranch,
          workItemId: dto.workItemId,
          lineageStage: dto.lineageStage,
          assessmentRound: dto.assessmentRound,
          headSha: dto.headSha,
          stageRoundKey: dto.stageRoundKey,
          findingIds: dto.findingIds,
          fixSourceTaskId: dto.fixSourceTaskId,
          failureCount: 0,
          durationMs: 0,
          tokensPerSec: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (dto.stageRoundKey) {
          existingMap.set(dto.stageRoundKey, task);
        }
        return task;
      },
    };

    const coordinator = new PrFixTaskCoordinator(mockTaskRepo as TaskRepository);

    const res = await coordinator.enqueueFixTask({
      workItemId: "wi-8840",
      parentTaskId: "task-orig-impl",
      prNumber: 55,
      prBranch: "task/wi-8840-impl",
      currentRound: 1,
      headSha: "head12345678",
      report: dummyReport,
    });

    assert.strictEqual(res.enqueued, true);
    assert.strictEqual(res.stageRoundKey, "wi-8840:fix:r2:head1234");
    assert.ok(createdPayload);
    assert.strictEqual(createdPayload.role, "fixer");
    assert.strictEqual(createdPayload.priority, "P0");
    assert.strictEqual(createdPayload.targetBranch, "task/wi-8840-impl", "Must target existing PR branch");
    assert.strictEqual(createdPayload.focusFiles, "src/services/AuthService.ts");
    assert.ok(createdPayload.prompt.includes("Unchecked null pointer in user session lookup"));
    assert.ok(createdPayload.prompt.includes("const user = session?.user; if (!user) return null;"));

    // Duplicate call with exact same stageRoundKey must be idempotent
    const duplicateRes = await coordinator.enqueueFixTask({
      workItemId: "wi-8840",
      parentTaskId: "task-orig-impl",
      prNumber: 55,
      prBranch: "task/wi-8840-impl",
      currentRound: 1,
      headSha: "head12345678",
      report: dummyReport,
    });

    assert.strictEqual(duplicateRes.enqueued, false);
    assert.ok(duplicateRes.reason?.includes("already exists"));
  });

  test("should not enqueue fix task if there are no actionable findings", async () => {
    const emptyReport: StructuredAssessmentReport = {
      ...dummyReport,
      findings: [],
    };

    const mockTaskRepo: Partial<TaskRepository> = {
      findByStageRoundKey: async () => null,
    };

    const coordinator = new PrFixTaskCoordinator(mockTaskRepo as TaskRepository);

    const res = await coordinator.enqueueFixTask({
      workItemId: "wi-8841",
      parentTaskId: "task-impl-2",
      prNumber: 56,
      prBranch: "task/wi-8841-impl",
      currentRound: 1,
      headSha: "head12345678",
      report: emptyReport,
    });

    assert.strictEqual(res.enqueued, false);
    assert.ok(res.reason?.includes("No actionable findings"));
  });
});
