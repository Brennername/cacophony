import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { GitWorktreeManager } from "../GitWorktreeManager.js";
import { GiteaWebhookReceiver } from "../GiteaWebhookReceiver.js";
import { AutomatedPrPublisher } from "../AutomatedPrPublisher.js";

describe("Phase 39: Closed-Loop Gitea PR Automation, GitOps & Micro-Checkpoints", () => {
  it("T39.1: GitWorktreeManager formats standardized branch names and manages worktree directory", async () => {
    const manager = new GitWorktreeManager(process.cwd(), "/tmp/cacophony-test-workspaces");
    const branch = manager.formatBranchName("task-99", {
      priority: "P0",
      slug: "Fix User Auth Flow"
    });

    assert.equal(branch, "task/p0-task-99-fix-user-auth-flow");

    await manager.initialize();
    const stat = await fs.stat("/tmp/cacophony-test-workspaces");
    assert.ok(stat.isDirectory());
  });

  it("T39.1: GitWorktreeManager cleans up worktree directories for terminal tasks", async () => {
    const workspacesRoot = "/tmp/cacophony-test-workspaces";
    const manager = new GitWorktreeManager(process.cwd(), workspacesRoot);
    const mockWorktreePath = path.join(workspacesRoot, "worktree-task-term");
    await fs.mkdir(mockWorktreePath, { recursive: true });

    const beforeStat = await fs.stat(mockWorktreePath);
    assert.ok(beforeStat.isDirectory());

    await manager.cleanupTerminalTask("task-term");

    let exists = true;
    try {
      await fs.stat(mockWorktreePath);
    } catch {
      exists = false;
    }
    assert.equal(exists, false);
  });

  it("T39.2: GiteaWebhookReceiver dispatches remediation task when review requests changes", async () => {
    const createdTasks: any[] = [];
    const mockTaskRepo: any = {
      create: async (task: any) => {
        createdTasks.push(task);
        return task;
      },
      listPending: async () => [
        { id: "parent-task-1", targetBranch: "task/p1-task-1-fix-bug", status: "RUNNING" }
      ],
      updateStatus: async (id: string, status: string) => {
        const t = createdTasks.find((x) => x.id === id);
        if (t) t.status = status;
      }
    };

    const receiver = new GiteaWebhookReceiver(mockTaskRepo, "secret-123");

    const result = await receiver.handleWebhook("pull_request_review", {
      action: "submitted",
      review: {
        id: 101,
        state: "REQUEST_CHANGES",
        body: "Please address null pointer vulnerability on line 42",
        user: { login: "lead-architect" }
      },
      pull_request: {
        number: 42,
        title: "Feature X",
        body: "Initial implementation",
        head: { ref: "task/p1-task-1-fix-bug" }
      }
    });

    assert.equal(result.processed, true);
    assert.equal(result.actionTriggered, "remediation_task_enqueued");
    assert.ok(result.taskId?.startsWith("remedy-pr-42-"));

    assert.equal(createdTasks.length, 1);
    assert.equal(createdTasks[0].priority, "P0");
    assert.ok(createdTasks[0].prompt.includes("null pointer vulnerability"));
    assert.equal(createdTasks[0].targetBranch, "task/p1-task-1-fix-bug");
  });

  it("T39.2: GiteaWebhookReceiver triggers automated squash-and-merge on APPROVE", async () => {
    let mergeCalled = false;
    const mockGiteaClient: any = {
      mergePullRequest: async (owner: string, repo: string, prNumber: number, req: any) => {
        mergeCalled = true;
        assert.equal(owner, "cacophony-org");
        assert.equal(repo, "cacophony");
        assert.equal(prNumber, 55);
        assert.equal(req.Do, "squash");
      }
    };

    const completedStatusUpdates: string[] = [];
    const mockTaskRepo: any = {
      listPending: async () => [
        { id: "task-55-approved", targetBranch: "task/p0-task-55-feat", status: "IN_REVIEW" }
      ],
      updateStatus: async (id: string, status: string) => {
        completedStatusUpdates.push(`${id}:${status}`);
      }
    };

    const receiver = new GiteaWebhookReceiver(mockTaskRepo, undefined, mockGiteaClient);

    const result = await receiver.handleWebhook("pull_request_review", {
      action: "submitted",
      review: {
        id: 102,
        state: "APPROVED",
        body: "LGTM!",
        user: { login: "qa-lead" }
      },
      repository: {
        name: "cacophony",
        full_name: "cacophony-org/cacophony",
        clone_url: "http://git/cacophony.git",
        default_branch: "main",
        owner: { login: "cacophony-org" }
      },
      pull_request: {
        number: 55,
        title: "Clean Feature",
        body: "All tests pass",
        head: { ref: "task/p0-task-55-feat" }
      }
    });

    assert.equal(result.processed, true);
    assert.equal(result.actionTriggered, "pr_approved_merged");
    assert.equal(mergeCalled, true);
    assert.ok(completedStatusUpdates.includes("task-55-approved:COMPLETED"));
  });

  it("T39.2: AutomatedPrPublisher pushes branch and formats structured PR summary", async () => {
    let prCreated = false;
    const mockGiteaClient: any = {
      createPullRequest: async (owner: string, repo: string, payload: any) => {
        prCreated = true;
        assert.equal(owner, "devs");
        assert.equal(repo, "repo1");
        assert.ok(payload.body.includes("Verification Summary"));
        return {
          id: 1,
          number: 12,
          title: payload.title,
          html_url: "http://gitea/devs/repo1/pulls/12"
        };
      }
    };

    const mockWorktreeManager: any = {
      commitWorktree: async () => "commit ok",
      pushBranch: async () => {}
    };

    const publisher = new AutomatedPrPublisher(mockGiteaClient, mockWorktreeManager);
    const pubResult = await publisher.publishPullRequest(
      { taskId: "task-100", branchName: "task/p1-task-100-test", worktreePath: "/tmp" },
      {
        owner: "devs",
        repo: "repo1",
        taskId: "task-100",
        title: "Automated Fix",
        testSummary: "All 18 unit tests passed in 45ms",
        commitMessage: "feat: automated fix"
      }
    );

    assert.equal(pubResult.success, true);
    assert.equal(prCreated, true);
    assert.equal(pubResult.pullRequest?.number, 12);
  });
});
