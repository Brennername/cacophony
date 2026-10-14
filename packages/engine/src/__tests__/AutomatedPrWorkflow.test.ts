import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AutomatedPrWorkflow } from "../gitea/AutomatedPrWorkflow.js";
import type { GiteaApiClient } from "../gitea/GiteaApiClient.js";
import type { GitWorktreeManager, WorktreeDescriptor } from "../gitea/GitWorktreeManager.js";
import type { GiteaPullRequest } from "../gitea/giteaTypes.js";

describe("T88.1.2: AutomatedPrWorkflow Idempotency and Lineage Keying", () => {
  const dummyWorktree: WorktreeDescriptor = {
    worktreePath: "/tmp/cacophony-wt-1",
    branchName: "task/wi-8801-impl",
    taskId: "task-1",
  };

  const dummyPr: GiteaPullRequest = {
    id: 101,
    number: 101,
    title: "Implement lineage keys",
    body: "Summary",
    state: "open",
    head: { ref: "task/wi-8801-impl", sha: "abc1234567890" },
    base: { ref: "main", sha: "mainsha" },
    html_url: "http://localhost:19634/NeXeN/cacophony/pulls/101",
    merged: false,
    diff_url: "http://localhost:19634/NeXeN/cacophony/pulls/101.diff",
  };

  test("should publish PR and record stageRoundKey idempotency", async () => {
    let commitCount = 0;
    let pushCount = 0;
    let createPrCount = 0;

    const mockGiteaClient: Partial<GiteaApiClient> = {
      listPullRequests: async () => [],
      createPullRequest: async () => {
        createPrCount++;
        return dummyPr;
      },
    };

    const mockWorktreeManager: Partial<GitWorktreeManager> = {
      commitWorktree: async () => {
        commitCount++;
        return "commit-sha-1";
      },
      pushBranch: async () => {
        pushCount++;
      },
    };

    const workflow = new AutomatedPrWorkflow(
      mockGiteaClient as GiteaApiClient,
      mockWorktreeManager as GitWorktreeManager,
    );

    const stageRoundKey = "wi-8801:implementation:r1:abc12345";
    const res1 = await workflow.publishPullRequest(dummyWorktree, {
      owner: "NeXeN",
      repo: "cacophony",
      taskId: "task-1",
      title: "Implement lineage keys",
      testSummary: "All tests green",
      commitMessage: "feat: lineage keys",
      stageRoundKey,
    });

    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.pullRequest?.number, 101);
    assert.strictEqual(commitCount, 1);
    assert.strictEqual(pushCount, 1);
    assert.strictEqual(createPrCount, 1);
    assert.strictEqual(workflow.isStageRoundProcessed(stageRoundKey), true);

    // Duplicate invocation with the exact same stageRoundKey
    const res2 = await workflow.publishPullRequest(dummyWorktree, {
      owner: "NeXeN",
      repo: "cacophony",
      taskId: "task-1",
      title: "Implement lineage keys",
      testSummary: "All tests green",
      commitMessage: "feat: lineage keys",
      stageRoundKey,
    });

    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.pullRequest?.number, 101);
    assert.strictEqual(commitCount, 1, "Should not recommit on duplicate stage-round key");
    assert.strictEqual(pushCount, 1, "Should not repush on duplicate stage-round key");
    assert.strictEqual(createPrCount, 1, "Should not recreate PR on duplicate stage-round key");
  });

  test("should reuse existing open PR on Gitea if one already exists for branch", async () => {
    let createPrCount = 0;

    const mockGiteaClient: Partial<GiteaApiClient> = {
      listPullRequests: async () => [dummyPr],
      createPullRequest: async () => {
        createPrCount++;
        return dummyPr;
      },
    };

    const mockWorktreeManager: Partial<GitWorktreeManager> = {
      commitWorktree: async () => "commit-sha-2",
      pushBranch: async () => {},
    };

    const workflow = new AutomatedPrWorkflow(
      mockGiteaClient as GiteaApiClient,
      mockWorktreeManager as GitWorktreeManager,
    );

    const res = await workflow.publishPullRequest(dummyWorktree, {
      owner: "NeXeN",
      repo: "cacophony",
      taskId: "task-2",
      title: "Existing PR check",
      testSummary: "Pass",
      commitMessage: "feat: existing",
      workItemId: "wi-8802",
      round: 1,
      headSha: "abc123456",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.pullRequest?.number, 101);
    assert.strictEqual(createPrCount, 0, "Must not call createPullRequest if PR already open on Gitea");
  });
});
