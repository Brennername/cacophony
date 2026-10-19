import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import type { TaskRepository } from "@cacophony/db";
import type { TaskRecord } from "@cacophony/shared-types";
import type {
  IGitPlatformProvider,
  GitPlatformIssue,
  CreateGitIssueOptions,
  CloseGitIssueOptions,
  GitPlatformPullRequest,
} from "../gitea/IGitPlatformProvider.js";
import {
  AutomatedIssueSynthesizer,
  type DiscoveredGap,
  type DiscoveredRegression,
} from "../gitea/AutomatedIssueSynthesizer.js";

describe("T103.3: AutomatedIssueSynthesizer Unit Tests", () => {
  interface MockGitProviderState {
    createdIssues: Array<{ owner: string; repo: string; opts: CreateGitIssueOptions }>;
    closedIssues: Array<{
      owner: string;
      repo: string;
      issueNumber: number;
      opts?: CloseGitIssueOptions | undefined;
    }>;
  }

  function createMockGitProvider(): IGitPlatformProvider & MockGitProviderState {
    const state: MockGitProviderState = {
      createdIssues: [],
      closedIssues: [],
    };

    const provider: Partial<IGitPlatformProvider> & MockGitProviderState = {
      createdIssues: state.createdIssues,
      closedIssues: state.closedIssues,
      async openPullRequest(): Promise<GitPlatformPullRequest> {
        return {
          id: 1,
          number: 1,
          title: "PR",
          body: "PR body",
          state: "open",
          htmlUrl: "https://gitea.local/repo/pulls/1",
          headRef: "feature",
          baseRef: "main",
          merged: false,
        };
      },
      async getPullRequest(): Promise<GitPlatformPullRequest> {
        return {
          id: 1,
          number: 1,
          title: "PR",
          body: "PR body",
          state: "open",
          htmlUrl: "https://gitea.local/repo/pulls/1",
          headRef: "feature",
          baseRef: "main",
          merged: false,
        };
      },
      async mergePullRequest(): Promise<boolean> {
        return true;
      },
      async createIssue(
        owner: string,
        repo: string,
        options: CreateGitIssueOptions,
      ): Promise<GitPlatformIssue> {
        const issueNum = this.createdIssues.length + 101;
        this.createdIssues.push({ owner, repo, opts: options });
        return {
          id: issueNum,
          number: issueNum,
          title: options.title,
          body: options.body,
          state: "open",
          htmlUrl: `https://gitea.local/${owner}/${repo}/issues/${issueNum}`,
          labels: options.labels ? [...options.labels] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
      async closeIssue(
        owner: string,
        repo: string,
        issueNumber: number,
        options?: CloseGitIssueOptions,
      ): Promise<void> {
        this.closedIssues.push({ owner, repo, issueNumber, opts: options });
      },
      async listIssues(): Promise<GitPlatformIssue[]> {
        return [];
      },
      async getIssue(
        _owner: string,
        _repo: string,
        issueNumber: number,
      ): Promise<GitPlatformIssue> {
        return {
          id: issueNumber,
          number: issueNumber,
          title: "Mock Issue",
          body: "Mock Body",
          state: "open",
          htmlUrl: `https://gitea.local/owner/repo/issues/${issueNumber}`,
          labels: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
    };

    return provider as unknown as IGitPlatformProvider & MockGitProviderState;
  }

  function createMockTaskRepo(): {
    repo: TaskRepository;
    tasks: Map<string, TaskRecord>;
  } {
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

  it("should scan code and discover TODOs, FIXMEs, and stub throws", () => {
    const gitProvider = createMockGitProvider();
    const { repo } = createMockTaskRepo();
    const synthesizer = new AutomatedIssueSynthesizer({ gitProvider, taskRepo: repo });

    const sourceCode = [
      "export class PaymentService {",
      "  // TODO: Add support for Stripe webhooks",
      "  public process(): void {",
      "    // FIXME: Validate customer currency before charging",
      "    throw new Error('not implemented yet');",
      "  }",
      "  public getTransactions() {",
      "    return [] as any;",
      "  }",
      "}",
    ].join("\n");

    const gaps = synthesizer.scanCodeForGaps("src/services/PaymentService.ts", sourceCode);

    assert.strictEqual(gaps.length, 4);
    assert.strictEqual(gaps[0]?.type, "todo");
    assert.strictEqual(gaps[0]?.lineNumber, 2);
    assert.strictEqual(gaps[1]?.type, "fixme");
    assert.strictEqual(gaps[1]?.lineNumber, 4);
    assert.strictEqual(gaps[2]?.type, "stub_throw");
    assert.strictEqual(gaps[2]?.lineNumber, 5);
    assert.strictEqual(gaps[3]?.type, "mock_placeholder");
    assert.strictEqual(gaps[3]?.lineNumber, 8);
  });

  it("should ignore stub throws and mock placeholders in test files", () => {
    const gitProvider = createMockGitProvider();
    const { repo } = createMockTaskRepo();
    const synthesizer = new AutomatedIssueSynthesizer({ gitProvider, taskRepo: repo });

    const testCode = [
      "describe('PaymentService Test', () => {",
      "  it('should throw stub error for edge cases', () => {",
      "    throw new Error('not implemented');",
      "    return {} as any;",
      "  });",
      "});",
    ].join("\n");

    const gaps = synthesizer.scanCodeForGaps("src/tests/PaymentService.test.ts", testCode);
    assert.strictEqual(gaps.length, 0);
  });

  it("should scan test failure outputs and extract regression information", () => {
    const gitProvider = createMockGitProvider();
    const { repo } = createMockTaskRepo();
    const synthesizer = new AutomatedIssueSynthesizer({ gitProvider, taskRepo: repo });

    const testOutput = [
      "TAP version 13",
      "# Subtest: ModelVramCatalog Tests",
      "not ok 1 - ModelVramCatalog > should calculate footprint for 7B models",
      "  ---",
      "  duration_ms: 12.4",
      "  location: 'packages/engine/src/tests/vram_catalog.test.ts:45:5'",
      "  failureType: 'testCodeFailure'",
      "  error: 'AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: 4096 !== 8192'",
      "  code: 'ERR_ASSERTION'",
      "  ...",
      "1..1",
    ].join("\n");

    const regressions = synthesizer.scanTestFailuresForRegressions(
      testOutput,
      "npm test --workspace=@cacophony/engine",
    );

    assert.strictEqual(regressions.length, 1);
    assert.strictEqual(
      regressions[0]?.testName,
      "ModelVramCatalog > should calculate footprint for 7B models",
    );
    assert.ok(regressions[0]?.failureReason.includes("ERR_ASSERTION"));
    assert.ok(regressions[0]?.location?.includes("vram_catalog.test.ts:45:5"));
    assert.strictEqual(
      regressions[0]?.testCommand,
      "npm test --workspace=@cacophony/engine",
    );
  });

  it("should submit a gap issue to Git platform and enqueue task into repository", async () => {
    const gitProvider = createMockGitProvider();
    const { repo, tasks } = createMockTaskRepo();
    const synthesizer = new AutomatedIssueSynthesizer({ gitProvider, taskRepo: repo });

    const gap: DiscoveredGap = {
      type: "stub_throw",
      filePath: "src/billing/StripeGateway.ts",
      lineNumber: 42,
      matchedText: "throw new Error('not implemented');",
      surroundingContext: "41: public capture() {\n42: throw new Error('not implemented');\n43: }",
    };

    const result = await synthesizer.submitGapIssue({
      owner: "cacophony",
      repo: "cacophony",
      gap,
      taskId: "task-initial-123",
      modelName: "deepseek-r1:8b",
    });

    assert.strictEqual(result.created, true);
    assert.ok(result.issue);
    assert.strictEqual(result.issue?.number, 101);
    assert.ok(result.taskId?.startsWith("gap-"));

    // Check Git platform call
    assert.strictEqual(gitProvider.createdIssues.length, 1);
    assert.ok(gitProvider.createdIssues[0]?.opts.title.includes("[Unimplemented/Gap]"));
    assert.deepStrictEqual(gitProvider.createdIssues[0]?.opts.labels, [
      "gap",
      "autonomous-backlog",
    ]);

    // Check task enqueue in repository
    assert.strictEqual(tasks.size, 1);
    const createdTask = tasks.get(result.taskId!);
    assert.ok(createdTask);
    assert.strictEqual(createdTask?.role, "implementer");
    assert.strictEqual(createdTask?.priority, "P1");
    assert.strictEqual(createdTask?.focusFiles, "src/billing/StripeGateway.ts");

    // Attempting to submit duplicate gap returns existing task
    const duplicateResult = await synthesizer.submitGapIssue({
      owner: "cacophony",
      repo: "cacophony",
      gap,
    });
    assert.strictEqual(duplicateResult.created, false);
    assert.strictEqual(duplicateResult.taskId, result.taskId);
    assert.strictEqual(gitProvider.createdIssues.length, 1); // No new issue created
  });

  it("should submit a regression issue to Git platform and enqueue P0 test engineer task", async () => {
    const gitProvider = createMockGitProvider();
    const { repo, tasks } = createMockTaskRepo();
    const synthesizer = new AutomatedIssueSynthesizer({ gitProvider, taskRepo: repo });

    const regression: DiscoveredRegression = {
      testName: "ModelVramCatalog > should calculate footprint for 7B models",
      failureReason: "AssertionError: 4096 !== 8192",
      location: "packages/engine/src/tests/vram_catalog.test.ts:45:5",
      testCommand: "npm test --workspace=@cacophony/engine",
    };

    const result = await synthesizer.submitRegressionIssue({
      owner: "cacophony",
      repo: "cacophony",
      regression,
      taskId: "task-upstream-999",
      focusFiles: "packages/engine/src/hardware/ModelVramCatalog.ts",
    });

    assert.strictEqual(result.created, true);
    assert.ok(result.issue);
    assert.ok(result.taskId?.startsWith("regr-"));

    // Check Git platform call
    assert.strictEqual(gitProvider.createdIssues.length, 1);
    assert.ok(gitProvider.createdIssues[0]?.opts.title.includes("[TDD Regression]"));
    assert.deepStrictEqual(gitProvider.createdIssues[0]?.opts.labels, [
      "regression",
      "tdd-refactor",
    ]);

    // Check task enqueued with P0 priority and test_engineer role
    const createdTask = tasks.get(result.taskId!);
    assert.ok(createdTask);
    assert.strictEqual(createdTask?.role, "test_engineer");
    assert.strictEqual(createdTask?.priority, "P0");
    assert.strictEqual(
      createdTask?.focusFiles,
      "packages/engine/src/hardware/ModelVramCatalog.ts",
    );
  });

  it("should close resolved issues with reasoning model signature", async () => {
    const gitProvider = createMockGitProvider();
    const { repo } = createMockTaskRepo();
    const synthesizer = new AutomatedIssueSynthesizer({ gitProvider, taskRepo: repo });

    await synthesizer.closeResolvedIssue(
      "cacophony",
      "cacophony",
      105,
      "Implemented Stripe payment gateway with idempotent webhooks and passed test suite.",
      "deepseek-r1:8b",
    );

    assert.strictEqual(gitProvider.closedIssues.length, 1);
    const closed = gitProvider.closedIssues[0];
    assert.strictEqual(closed?.owner, "cacophony");
    assert.strictEqual(closed?.repo, "cacophony");
    assert.strictEqual(closed?.issueNumber, 105);
    assert.ok(closed?.opts?.comment?.includes("Verified by model: **deepseek-r1:8b**"));
    assert.ok(closed?.opts?.comment?.includes("Implemented Stripe payment gateway"));
  });
});
