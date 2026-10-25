import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import type { TaskRepository } from "@cacophony/db";
import type { TaskRecord } from "@cacophony/shared-types";
import type {
  IGitPlatformProvider,
  GitPlatformIssue,
  GitPlatformPullRequest,
  DependabotSecurityAlert,
  CreateGitIssueOptions,
  CloseGitIssueOptions,
  MergeGitPullRequestOptions,
  SubmitGitReviewOptions,
} from "../gitea/IGitPlatformProvider.js";
import type { IInferenceProvider } from "../inference/IInferenceProvider.js";
import { GitHubSecurityAndIssueBridge } from "../gitea/GitHubSecurityAndIssueBridge.js";

describe("T103.4: GitHubSecurityAndIssueBridge Unit Tests", () => {
  function createMockPlatform(name: string) {
    const issues: GitPlatformIssue[] = [];
    const prs: GitPlatformPullRequest[] = [];
    const dependabotAlerts: DependabotSecurityAlert[] = [];
    const closedIssues: Array<{
      owner: string;
      repo: string;
      issueNumber: number;
      opts?: CloseGitIssueOptions | undefined;
    }> = [];
    const mergedPrs: Array<{
      owner: string;
      repo: string;
      prNumber: number;
      opts?: MergeGitPullRequestOptions | undefined;
    }> = [];
    const comments: Array<{ owner: string; repo: string; number: number; body: string }> = [];

    const reviews: Array<{ owner: string; repo: string; prNumber: number; opts: SubmitGitReviewOptions }> = [];

    const provider: Partial<IGitPlatformProvider> = {
      async listDependabotAlerts(): Promise<DependabotSecurityAlert[]> {
        return dependabotAlerts;
      },
      async listIssues(): Promise<GitPlatformIssue[]> {
        return issues;
      },
      async listPullRequests(): Promise<GitPlatformPullRequest[]> {
        return prs;
      },
      async createIssue(
        owner: string,
        repo: string,
        options: CreateGitIssueOptions,
      ): Promise<GitPlatformIssue> {
        const id = issues.length + 1;
        const issue: GitPlatformIssue = {
          id,
          number: id,
          title: options.title,
          body: options.body,
          state: "open",
          htmlUrl: `https://${name}.local/${owner}/${repo}/issues/${id}`,
          labels: options.labels ? [...options.labels] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        issues.push(issue);
        return issue;
      },
      async closeIssue(
        owner: string,
        repo: string,
        issueNumber: number,
        options?: CloseGitIssueOptions,
      ): Promise<void> {
        closedIssues.push({ owner, repo, issueNumber, opts: options });
      },
      async submitReview(
        owner: string,
        repo: string,
        prNumber: number,
        options: SubmitGitReviewOptions,
      ): Promise<{ id: number; status: string }> {
        reviews.push({ owner, repo, prNumber, opts: options });
        return { id: reviews.length, status: options.event };
      },
      async mergePullRequest(
        owner: string,
        repo: string,
        prNumber: number,
        options?: MergeGitPullRequestOptions,
      ): Promise<boolean> {
        mergedPrs.push({ owner, repo, prNumber, opts: options });
        return true;
      },
      async createIssueComment(
        owner: string,
        repo: string,
        number: number,
        body: string,
      ): Promise<void> {
        comments.push({ owner, repo, number, body });
      },
      async getPullRequestDiff(): Promise<string> {
        return "diff --git a/src/app.ts b/src/app.ts\n+console.log('fix');";
      },
    };

    return {
      provider: provider as unknown as IGitPlatformProvider,
      issues,
      prs,
      dependabotAlerts,
      closedIssues,
      mergedPrs,
      comments,
      reviews,
    };
  }

  function createMockTaskRepo() {
    const tasks = new Map<string, TaskRecord>();
    const mockRepo: Partial<TaskRepository> = {
      async getByTitle(title: string): Promise<TaskRecord | null> {
        for (const task of tasks.values()) {
          if (task.title === title) {
            return task;
          }
        }
        return null;
      },
      async create(task: TaskRecord): Promise<TaskRecord> {
        tasks.set(task.id, task);
        return task;
      },
    };

    return {
      repo: mockRepo as unknown as TaskRepository,
      tasks,
    };
  }

  function createMockInferenceProvider(): IInferenceProvider {
    return {
      getProviderType: () => "ollama",
      generate: async (req) => {
        return {
          content: `Reasoning analysis completed for prompt snippet with model ${req.model}. No breaking regressions identified.`,
          model: req.model,
          tokensPrompt: 100,
          tokensCompletion: 50,
          totalTokens: 150,
          latencyMs: 120,
          tokensPerSec: 30,
        };
      },
      stream: async (req, onChunk) => {
        onChunk("streamed chunk");
        return {
          content: "streamed chunk",
          model: req.model,
          tokensPrompt: 50,
          tokensCompletion: 20,
          totalTokens: 70,
          latencyMs: 80,
          tokensPerSec: 25,
        };
      },
    };
  }

  it("should sync Dependabot alerts, evaluate with reasoning model, mirror to Gitea, and enqueue P0/P1 tasks", async () => {
    const gh = createMockPlatform("github");
    const gitea = createMockPlatform("gitea");
    const { repo, tasks } = createMockTaskRepo();
    const inferenceProvider = createMockInferenceProvider();

    const sampleAlert: DependabotSecurityAlert = {
      number: 12,
      state: "open",
      dependencyPackage: "tar",
      dependencyEcosystem: "npm",
      securityAdvisorySummary: "Arbitrary File Creation/Overwrite via insufficient symlink validation in tar",
      securityAdvisoryDescription: "Denial of service or file corruption vulnerability in node-tar.",
      severity: "critical",
      cveId: "CVE-2021-37712",
      htmlUrl: "https://github.com/cacophony/core/security/dependabot/12",
    };

    gh.dependabotAlerts.push(sampleAlert);

    const bridge = new GitHubSecurityAndIssueBridge({
      githubProvider: gh.provider,
      giteaProvider: gitea.provider,
      taskRepo: repo,
      inferenceProvider,
      defaultReasoningModel: "deepseek-r1:8b",
    });

    const result = await bridge.syncDependabotAlerts({
      githubOwner: "cacophony",
      githubRepo: "core",
      giteaOwner: "cacophony",
      giteaRepo: "core",
    });

    assert.strictEqual(result.totalIngested, 1);
    assert.strictEqual(result.createdGiteaIssues.length, 1);
    assert.strictEqual(gitea.issues.length, 1);
    assert.ok(gitea.issues[0]?.title.includes("[Dependabot CRITICAL] tar"));
    assert.ok(gitea.issues[0]?.body.includes("Reasoning analysis completed"));
    assert.ok(gitea.issues[0]?.body.includes("CVE-2021-37712"));

    // Verify task enqueued with P0 priority for critical severity and security_auditor role
    assert.strictEqual(tasks.size, 1);
    const task = tasks.get("gh-dependabot-12");
    assert.ok(task);
    assert.strictEqual(task?.priority, "P0");
    assert.strictEqual(task?.role, "security_auditor");
    assert.strictEqual(task?.focusFiles, "package.json");

    // Second sync should de-duplicate and not create redundant issues
    const secondResult = await bridge.syncDependabotAlerts({
      githubOwner: "cacophony",
      githubRepo: "core",
      giteaOwner: "cacophony",
      giteaRepo: "core",
    });
    assert.strictEqual(secondResult.totalIngested, 0);
    assert.strictEqual(gitea.issues.length, 1);
  });

  it("should sync external GitHub issues and PRs, mirror to Gitea, and enqueue arena tasks", async () => {
    const gh = createMockPlatform("github");
    const gitea = createMockPlatform("gitea");
    const { repo, tasks } = createMockTaskRepo();
    const inferenceProvider = createMockInferenceProvider();

    // Populate GitHub issues and PRs
    gh.issues.push({
      id: 55,
      number: 55,
      title: "Memory leak in long-lived SSE connections",
      body: "Clients disconnected unexpectedly still retain buffers in memory.",
      state: "open",
      htmlUrl: "https://github.com/cacophony/core/issues/55",
      labels: ["bug"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    gh.prs.push({
      id: 56,
      number: 56,
      title: "Refactor ModelVramCatalog to use static lookup tables",
      body: "Eliminates runtime regex evaluation for standard 7B and 8B models.",
      state: "open",
      htmlUrl: "https://github.com/cacophony/core/pull/56",
      headRef: "perf/vram-tables",
      baseRef: "main",
      merged: false,
    });

    const bridge = new GitHubSecurityAndIssueBridge({
      githubProvider: gh.provider,
      giteaProvider: gitea.provider,
      taskRepo: repo,
      inferenceProvider,
      defaultReasoningModel: "deepseek-r1:8b",
    });

    const result = await bridge.syncGitHubIssuesAndPrs({
      githubOwner: "cacophony",
      githubRepo: "core",
      giteaOwner: "cacophony",
      giteaRepo: "core",
    });

    assert.strictEqual(result.issuesIngested, 1);
    assert.strictEqual(result.prsIngested, 1);
    assert.strictEqual(gitea.issues.length, 2);

    // Verify task records
    const issueTask = tasks.get("gh-issue-55");
    assert.ok(issueTask);
    assert.strictEqual(issueTask?.role, "implementer");

    const prTask = tasks.get("gh-pr-56");
    assert.ok(prTask);
    assert.strictEqual(prTask?.role, "reviewer");
  });

  it("should promote verified resolutions: close GitHub issue with reasoning signature", async () => {
    const gh = createMockPlatform("github");
    const gitea = createMockPlatform("gitea");
    const { repo } = createMockTaskRepo();

    const bridge = new GitHubSecurityAndIssueBridge({
      githubProvider: gh.provider,
      giteaProvider: gitea.provider,
      taskRepo: repo,
      defaultReasoningModel: "deepseek-r1:8b",
    });

    const res = await bridge.promoteVerifiedResolution({
      githubOwner: "cacophony",
      githubRepo: "core",
      giteaOwner: "cacophony",
      giteaRepo: "core",
      itemType: "issue",
      externalNumber: 55,
      giteaIssueNumber: 1,
      resolutionVerdict: "Resolved socket leak in StreamRingBuffer with automated disposal listener.",
      verifierModel: "deepseek-r1:8b",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.closed, true);
    assert.strictEqual(gh.closedIssues.length, 1);
    assert.strictEqual(gh.closedIssues[0]?.issueNumber, 55);
    assert.ok(gh.closedIssues[0]?.opts?.comment?.includes("Verified by model: **deepseek-r1:8b**"));
    assert.strictEqual(gitea.closedIssues.length, 1);
    assert.strictEqual(gitea.closedIssues[0]?.issueNumber, 1);
  });

  it("should promote verified resolutions: squash-merge GitHub PR with review comment", async () => {
    const gh = createMockPlatform("github");
    const gitea = createMockPlatform("gitea");
    const { repo } = createMockTaskRepo();

    const bridge = new GitHubSecurityAndIssueBridge({
      githubProvider: gh.provider,
      giteaProvider: gitea.provider,
      taskRepo: repo,
      defaultReasoningModel: "deepseek-r1:8b",
    });

    const res = await bridge.promoteVerifiedResolution({
      githubOwner: "cacophony",
      githubRepo: "core",
      giteaOwner: "cacophony",
      giteaRepo: "core",
      itemType: "pr",
      externalNumber: 56,
      giteaIssueNumber: 2,
      resolutionVerdict: "All unit tests green. SOLID compliance verified by reasoning model.",
      verifierModel: "deepseek-r1:8b",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.merged, true);
    assert.strictEqual(gh.mergedPrs.length, 1);
    assert.strictEqual(gh.mergedPrs[0]?.prNumber, 56);
    assert.strictEqual(gh.comments.length, 1);
    assert.strictEqual(gh.comments[0]?.number, 56);
    assert.strictEqual(gitea.closedIssues.length, 1);
  });

  it("should process Dependabot pull requests: review with reasoning model and merge approved updates", async () => {
    const gh = createMockPlatform("github");
    const gitea = createMockPlatform("gitea");
    const { repo } = createMockTaskRepo();
    const inferenceProvider = createMockInferenceProvider();

    // Push Dependabot PR
    gh.prs.push({
      id: 101,
      number: 5,
      title: "chore(deps-dev): bump fast-uri from 3.1.8 to 3.1.9",
      body: "Bumps fast-uri from 3.1.8 to 3.1.9. Fixes CVE-2026-110306.",
      headRef: "dependabot/npm_and_yarn/fast-uri-3.1.9",
      baseRef: "master",
      state: "open",
      merged: false,
      htmlUrl: "https://github.com/cacophony/core/pull/5",
    });

    const bridge = new GitHubSecurityAndIssueBridge({
      githubProvider: gh.provider,
      giteaProvider: gitea.provider,
      taskRepo: repo,
      inferenceProvider,
      defaultReasoningModel: "deepseek-r1:8b",
    });

    const result = await bridge.processDependabotPullRequests({
      githubOwner: "cacophony",
      githubRepo: "core",
      giteaOwner: "cacophony",
      giteaRepo: "core",
      autoMerge: true,
    });

    assert.strictEqual(result.totalDiscovered, 1);
    assert.strictEqual(result.processed.length, 1);
    const item = result.processed[0]!;
    assert.strictEqual(item.prNumber, 5);
    assert.strictEqual(item.reviewed, true);
    assert.strictEqual(item.verdict, "APPROVED");
    assert.strictEqual(item.merged, true);
    assert.strictEqual(gh.mergedPrs.length, 1);
    assert.strictEqual(gh.mergedPrs[0]?.prNumber, 5);
  });
});
