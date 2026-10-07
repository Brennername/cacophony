import test from "node:test";
import assert from "node:assert/strict";
import { PrAssessmentCoordinator } from "../gitea/PrAssessmentCoordinator.js";
import { ConsensusReviewSynthesis } from "../inference/ReviewOpinionSynthesizer.js";
import type { TaskRecord } from "@cacophony/shared-types";
import type { TaskRepository } from "@cacophony/db";
import type { GiteaApiClient } from "../gitea/GiteaApiClient.js";

test("PrAssessmentCoordinator Suite (T94.3.2)", async (t) => {
  const mockTask: TaskRecord = {
    id: "task-001",
    title: "Implement user auth",
    prompt: "Create JWT token verification",
    role: "implementer",
    status: "RUNNING",
    priority: "P1",
    modelAssigned: "qwen2.5-coder:14b",
    testCommand: "npm test",
    focusFiles: "src/auth.ts",
    targetBranch: "feat-auth",
    prUrl: "http://gitea/pr/1",
    failureCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  await t.test("does not enqueue remediation when consensus verdict is APPROVE", async () => {
    const createdTasks: TaskRecord[] = [];
    const mockRepo = {
      create: async (task: TaskRecord) => {
        createdTasks.push(task);
        return task;
      },
    } as unknown as TaskRepository;

    const postedComments: string[] = [];
    const mockGitea = {
      postReviewComment: async (_owner: string, _repo: string, _pr: number, comment: string) => {
        postedComments.push(comment);
      },
    } as unknown as GiteaApiClient;

    const coordinator = new PrAssessmentCoordinator(mockRepo, mockGitea);

    const approveSynthesis: ConsensusReviewSynthesis = {
      consensusVerdict: "APPROVE",
      approvalCount: 3,
      requestChangesCount: 0,
      unifiedFindings: [],
      markdownComment: "Approved cleanly",
    };

    const outcome = await coordinator.handleAssessment({
      task: mockTask,
      prNumber: 1,
      synthesis: approveSynthesis,
      owner: "cacophony",
      repo: "main",
    });

    assert.equal(outcome.verdict, "APPROVE");
    assert.equal(outcome.remediationEnqueued, false);
    assert.equal(outcome.commentPosted, true);
    assert.equal(createdTasks.length, 0);
    assert.equal(postedComments.length, 1);
  });

  await t.test("enqueues P0 remediation task when consensus verdict is REQUEST_CHANGES", async () => {
    const createdTasks: TaskRecord[] = [];
    const mockRepo = {
      create: async (task: TaskRecord) => {
        createdTasks.push(task);
        return task;
      },
    } as unknown as TaskRepository;

    const postedComments: string[] = [];
    const mockGitea = {
      postReviewComment: async (_owner: string, _repo: string, _pr: number, comment: string) => {
        postedComments.push(comment);
      },
    } as unknown as GiteaApiClient;

    const coordinator = new PrAssessmentCoordinator(mockRepo, mockGitea);

    const requestChangesSynthesis: ConsensusReviewSynthesis = {
      consensusVerdict: "REQUEST_CHANGES",
      approvalCount: 1,
      requestChangesCount: 2,
      unifiedFindings: [
        {
          path: "src/auth/jwt.ts",
          lineNumber: 42,
          ruleId: "EXPIRATION_CHECK_MISSING",
          severity: "blocker",
          message: "Token expiration verification is missing",
          suggestion: "Add maxAge check against exp claim",
          reportingModels: ["deepseek-r1:8b"],
          reportingPersonas: ["SecurityAuditor"],
        },
      ],
      markdownComment: "Changes requested on token expiration",
    };

    const outcome = await coordinator.handleAssessment({
      task: mockTask,
      prNumber: 1,
      synthesis: requestChangesSynthesis,
      owner: "cacophony",
      repo: "main",
    });

    assert.equal(outcome.verdict, "REQUEST_CHANGES");
    assert.equal(outcome.remediationEnqueued, true);
    assert.ok(outcome.remediationTaskId);
    assert.equal(createdTasks.length, 1);

    const remediationTask = createdTasks[0]!;
    assert.equal(remediationTask.priority, "P0");
    assert.equal(remediationTask.role, "implementer");
    assert.equal(remediationTask.currentStage, "remediation");
    assert.ok(remediationTask.focusFiles?.includes("src/auth/jwt.ts"));
    assert.ok(remediationTask.prompt.includes("src/auth/jwt.ts (line 42)"));
    assert.ok(remediationTask.prompt.includes("Token expiration verification is missing"));
    assert.ok(remediationTask.prompt.includes("Add maxAge check against exp claim"));
  });
});
