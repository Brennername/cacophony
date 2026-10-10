import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TaskRecord } from "@cacophony/shared-types";
import { CommitImpactTracker } from "../analytics/CommitImpactTracker.js";
import { GitRegressionCorrelator } from "../analytics/GitRegressionCorrelator.js";

describe("CommitImpactTracker Test Suite (T99.4)", () => {
  const mockCommits = [
    {
      hash: "commit-1111111111111111111111111111111111111111",
      author: "EngineDev",
      timestamp: 1700000000000,
      subject: "feat: add anti-stub AST validation",
      filesChanged: ["packages/engine/src/rules/StubDetector.ts"]
    },
    {
      hash: "commit-2222222222222222222222222222222222222222",
      author: "EngineDev",
      timestamp: 1700005000000,
      subject: "refactor: optimize token streaming",
      filesChanged: ["packages/engine/src/inference/StreamTapManager.ts"]
    },
    {
      hash: "commit-3333333333333333333333333333333333333333",
      author: "EngineDev",
      timestamp: 1700010000000,
      subject: "chore: noisy experiment burning tokens",
      filesChanged: ["packages/engine/src/experimental.ts"]
    }
  ];

  const createMockTask = (options: {
    id: string;
    status: "COMPLETED" | "FAILED";
    commitHash?: string;
    baseCommitHash?: string;
    focusFiles?: string;
    failureReason?: string;
    durationMs?: number;
  }): TaskRecord => ({
    id: options.id,
    title: `Task ${options.id}`,
    prompt: `Test prompt for ${options.id}`,
    role: "implementer",
    status: options.status,
    priority: "P1",
    modelAssigned: "qwen2.5-coder:7b",
    testCommand: "npm test",
    focusFiles: options.focusFiles ?? "packages/engine/src/service.ts",
    targetBranch: "master",
    prUrl: null,
    failureCount: options.status === "FAILED" ? 1 : 0,
    createdAt: new Date(1700001000000).toISOString(),
    updatedAt: new Date(1700002000000).toISOString(),
    completedAt: new Date(1700002000000).toISOString(),
    commitHash: options.commitHash ?? null,
    baseCommitHash: options.baseCommitHash ?? null,
    failureReason: options.failureReason ?? null,
    durationMs: options.durationMs ?? 10_000
  });

  it("identifies STRICTER_GUARDRAIL when failures are driven by integrity and build gates", async () => {
    const tasks: TaskRecord[] = [
      createMockTask({
        id: "T1",
        status: "FAILED",
        commitHash: mockCommits[0]!.hash,
        focusFiles: "packages/engine/src/rules/StubDetector.ts",
        failureReason: "Anti-stub integrity check failed: detected placeholder TODO"
      }),
      createMockTask({
        id: "T2",
        status: "FAILED",
        commitHash: mockCommits[0]!.hash,
        focusFiles: "packages/engine/src/rules/StubDetector.ts",
        failureReason: "Pre-PR verification failed: MonorepoBuildGate rejected incomplete scaffold"
      })
    ];

    const mockTaskRepo: any = {
      listByCommitHash: async (h: string) => tasks.filter((t) => t.commitHash === h),
      listRecent: async () => tasks
    };

    const mockCorrelator = new GitRegressionCorrelator("/tmp", () => "");
    (mockCorrelator as any).getRecentCommits = () => mockCommits;
    (mockCorrelator as any).getCommitFiles = () => mockCommits[0]!.filesChanged;

    const tracker = new CommitImpactTracker({
      taskRepo: mockTaskRepo,
      correlator: mockCorrelator
    });

    const report = await tracker.evaluateCommitImpact(mockCommits[0]!.hash);

    assert.equal(report.commitHash, mockCommits[0]!.hash);
    assert.equal(report.tasksAttempted, 2);
    assert.equal(report.tasksFailed, 2);
    assert.equal(report.tasksPassed, 0);
    assert.equal(report.verdict, "STRICTER_GUARDRAIL");
    assert(report.rationale.includes("stricter engineering integrity"));
  });

  it("identifies IMPROVEMENT when tasks achieve high pass rate following commit", async () => {
    const tasks: TaskRecord[] = [
      createMockTask({
        id: "T10",
        status: "COMPLETED",
        baseCommitHash: mockCommits[1]!.hash,
        durationMs: 5000
      }),
      createMockTask({
        id: "T11",
        status: "COMPLETED",
        baseCommitHash: mockCommits[1]!.hash,
        durationMs: 6000
      }),
      createMockTask({
        id: "T12",
        status: "COMPLETED",
        baseCommitHash: mockCommits[1]!.hash,
        durationMs: 4000
      }),
      createMockTask({
        id: "T13",
        status: "FAILED",
        baseCommitHash: mockCommits[1]!.hash,
        failureReason: "Minor assertion failure"
      })
    ];

    const mockTaskRepo: any = {
      listByCommitHash: async (h: string) => tasks.filter((t) => t.baseCommitHash === h),
      listRecent: async () => tasks
    };

    const mockCorrelator = new GitRegressionCorrelator("/tmp", () => "");
    (mockCorrelator as any).getRecentCommits = () => mockCommits;
    (mockCorrelator as any).getCommitFiles = () => mockCommits[1]!.filesChanged;

    const tracker = new CommitImpactTracker({
      taskRepo: mockTaskRepo,
      correlator: mockCorrelator
    });

    const report = await tracker.evaluateCommitImpact(mockCommits[1]!.hash, 50.0);

    assert.equal(report.tasksAttempted, 4);
    assert.equal(report.tasksPassed, 3);
    assert.equal(report.passRatePercent, 75.0);
    assert.equal(report.deltaVsPriorCommit, 25.0);
    assert.equal(report.verdict, "IMPROVEMENT");
    assert(report.rationale.includes("Organic improvement"));
  });

  it("flags NOISY_WASTE when high tokens are burned with zero passes and no guardrails", async () => {
    const tasks: TaskRecord[] = [
      createMockTask({
        id: "T20",
        status: "FAILED",
        commitHash: mockCommits[2]!.hash,
        failureReason: "Random timeout",
        durationMs: 600_000 // simulates 30k tokens
      })
    ];

    const mockTaskRepo: any = {
      listByCommitHash: async (h: string) => tasks.filter((t) => t.commitHash === h),
      listRecent: async () => tasks
    };

    const mockCorrelator = new GitRegressionCorrelator("/tmp", () => "");
    (mockCorrelator as any).getRecentCommits = () => mockCommits;
    (mockCorrelator as any).getCommitFiles = () => mockCommits[2]!.filesChanged;

    const tracker = new CommitImpactTracker({
      taskRepo: mockTaskRepo,
      correlator: mockCorrelator
    });

    const report = await tracker.evaluateCommitImpact(mockCommits[2]!.hash);

    assert.equal(report.verdict, "NOISY_WASTE");
    assert(report.totalTokensConsumed > 20_000);
    assert(report.rationale.includes("local tokens"));
  });

  it("identifies DEGRADATION when pass rate drops significantly", async () => {
    const tasks: TaskRecord[] = [
      createMockTask({
        id: "T30",
        status: "FAILED",
        baseCommitHash: "commit-bad",
        failureReason: "Uncaught ReferenceError: foo is not defined"
      }),
      createMockTask({
        id: "T31",
        status: "FAILED",
        baseCommitHash: "commit-bad",
        failureReason: "Crash in core engine"
      }),
      createMockTask({
        id: "T32",
        status: "COMPLETED",
        baseCommitHash: "commit-bad"
      })
    ];

    const mockTaskRepo: any = {
      listByCommitHash: async () => tasks,
      listRecent: async () => tasks
    };

    const mockCorrelator = new GitRegressionCorrelator("/tmp", () => "");
    (mockCorrelator as any).getRecentCommits = () => [
      {
        hash: "commit-bad",
        author: "Dev",
        timestamp: 1700000000000,
        subject: "bad commit",
        filesChanged: ["src/broken.ts"]
      }
    ];
    (mockCorrelator as any).getCommitFiles = () => ["src/broken.ts"];

    const tracker = new CommitImpactTracker({
      taskRepo: mockTaskRepo,
      correlator: mockCorrelator
    });

    const report = await tracker.evaluateCommitImpact("commit-bad", 70.0);

    assert.equal(report.verdict, "DEGRADATION");
    assert(report.deltaVsPriorCommit < -15.0);
    assert(report.rationale.includes("Regression identified"));
  });
});
