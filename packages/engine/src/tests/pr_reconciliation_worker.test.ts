import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PrReconciliationWorker,
  type ReconciliationReport,
} from "../gitea/PrReconciliationWorker.js";
import type { GiteaApiClient } from "../gitea/GiteaApiClient.js";
import type { GiteaPullRequest, MergePullRequestRequest } from "../gitea/giteaTypes.js";

describe("T112.2: PrReconciliationWorker Unit Tests", () => {
  it("should audit open PRs and squash-merge clean mergeable PRs", async () => {
    const mergedCalls: { prNumber: number; mergeReq: MergePullRequestRequest }[] = [];

    const mockClient = {
      listPullRequests: async (
        _owner: string,
        _repo: string,
        _state: string,
        _page: number,
        _limit: number,
      ): Promise<GiteaPullRequest[]> => {
        return [
          {
            id: 101,
            number: 101,
            title: "feat(engine): Add New Telemetry Metric",
            body: "Task regr-abc1234",
            state: "open",
            merged: false,
            mergeable: true,
            head: { ref: "task/regr-abc1234", sha: "abc111" },
            base: { ref: "main", sha: "main000" },
            html_url: "http://localhost:19634/NeXeN/cacophony/pulls/101",
            diff_url: "http://localhost:19634/NeXeN/cacophony/pulls/101.diff",
          },
          {
            id: 102,
            number: 102,
            title: "fix(engine): Conflicted Fix",
            body: "Task regr-xyz5678",
            state: "open",
            merged: false,
            mergeable: false,
            head: { ref: "task/regr-xyz5678", sha: "xyz222" },
            base: { ref: "main", sha: "main000" },
            html_url: "http://localhost:19634/NeXeN/cacophony/pulls/102",
            diff_url: "http://localhost:19634/NeXeN/cacophony/pulls/102.diff",
          },
        ];
      },
      mergePullRequest: async (
        _owner: string,
        _repo: string,
        prNumber: number,
        mergeReq: MergePullRequestRequest,
      ): Promise<void> => {
        mergedCalls.push({ prNumber, mergeReq });
      },
    } as unknown as GiteaApiClient;

    const worker = new PrReconciliationWorker({
      giteaClient: mockClient,
      owner: "TestOwner",
      repo: "TestRepo",
      autoMergeClean: true,
    });

    const report: ReconciliationReport = await worker.reconcileOnce();

    assert.equal(report.totalAudited, 2);
    assert.equal(report.mergedCount, 1);
    assert.equal(report.conflictedCount, 1);
    assert.equal(report.failedCount, 0);
    assert.deepEqual(report.mergedPrs, [101]);
    assert.deepEqual(report.conflictedPrs, [102]);

    assert.equal(mergedCalls.length, 1);
    assert.equal(mergedCalls[0]?.prNumber, 101);
    assert.equal(mergedCalls[0]?.mergeReq.Do, "squash");
    assert.equal(mergedCalls[0]?.mergeReq.delete_branch_after_merge, true);
  });

  it("should skip already merged or closed PRs", async () => {
    const mockClient = {
      listPullRequests: async (): Promise<GiteaPullRequest[]> => {
        return [
          {
            id: 201,
            number: 201,
            title: "Closed PR",
            body: "Already closed",
            state: "closed",
            merged: false,
            mergeable: true,
            head: { ref: "branch-a", sha: "sha-a" },
            base: { ref: "main", sha: "sha-m" },
            html_url: "",
            diff_url: "",
          },
          {
            id: 202,
            number: 202,
            title: "Merged PR",
            body: "Already merged",
            state: "open",
            merged: true,
            mergeable: true,
            head: { ref: "branch-b", sha: "sha-b" },
            base: { ref: "main", sha: "sha-m" },
            html_url: "",
            diff_url: "",
          },
        ];
      },
      mergePullRequest: async (): Promise<void> => {
        assert.fail("mergePullRequest should not be called for closed/merged PRs");
      },
    } as unknown as GiteaApiClient;

    const worker = new PrReconciliationWorker({
      giteaClient: mockClient,
      autoMergeClean: true,
    });

    const report = await worker.reconcileOnce();
    assert.equal(report.totalAudited, 2);
    assert.equal(report.skippedCount, 2);
    assert.equal(report.mergedCount, 0);
  });

  it("should handle merge failures gracefully without crashing cycle", async () => {
    const mockClient = {
      listPullRequests: async (): Promise<GiteaPullRequest[]> => {
        return [
          {
            id: 301,
            number: 301,
            title: "Failing Merge PR",
            body: "Fail test",
            state: "open",
            merged: false,
            mergeable: true,
            head: { ref: "branch-f", sha: "sha-f" },
            base: { ref: "main", sha: "sha-m" },
            html_url: "",
            diff_url: "",
          },
        ];
      },
      mergePullRequest: async (): Promise<void> => {
        throw new Error("409 Conflict: target branch has moved");
      },
    } as unknown as GiteaApiClient;

    const worker = new PrReconciliationWorker({
      giteaClient: mockClient,
      autoMergeClean: true,
    });

    const report = await worker.reconcileOnce();
    assert.equal(report.totalAudited, 1);
    assert.equal(report.failedCount, 1);
    assert.equal(report.mergedCount, 0);
  });

  it("should start and stop background polling timer", () => {
    const mockClient = {
      listPullRequests: async () => [],
    } as unknown as GiteaApiClient;

    const worker = new PrReconciliationWorker({
      giteaClient: mockClient,
      intervalMs: 100_000,
    });

    assert.equal(worker.isRunning(), false);
    worker.start();
    assert.equal(worker.isRunning(), true);
    // idempotent start
    worker.start();
    assert.equal(worker.isRunning(), true);
    worker.stop();
    assert.equal(worker.isRunning(), false);
  });
});
