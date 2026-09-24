import test from "node:test";
import assert from "node:assert/strict";
import { ClosedLoopPrCoordinator } from "../gitea/ClosedLoopPrCoordinator.js";
import { SystemToolScanner } from "../hardware/SystemToolScanner.js";
import type { GiteaApiClient } from "../gitea/GiteaApiClient.js";
import type { AutomatedPrWorkflow } from "../gitea/AutomatedPrWorkflow.js";
import type { AutomatedPrReviewLoop } from "../gitea/AutomatedPrReviewLoop.js";
import type { TaskRepository } from "@cacophony/db";
import type { TaskRecord } from "@cacophony/shared-types";

test("Phase 31: Closed-Loop PR Review, Remediation & System Tool Diagnostics", async (t) => {
  await t.test("T31.1: ClosedLoopPrCoordinator auto-merges when approved", async () => {
    let mergedPr = false;
    let updatedStatus: string | undefined;

    const mockClient = {
      mergePullRequest: async () => {
        mergedPr = true;
        return { message: "merged" };
      }
    } as unknown as GiteaApiClient;

    const mockWorkflow = {
      publishPullRequest: async () => ({
        success: true,
        pullRequest: { id: 1, number: 101, html_url: "http://gitea/pulls/101" },
        branchName: "feat/issue-101"
      })
    } as unknown as AutomatedPrWorkflow;

    const mockReviewLoop = {
      evaluatePullRequest: async () => ({
        verdict: "APPROVE" as const,
        record: {
          id: 1,
          taskId: "task-101",
          giteaPrId: 101,
          reviewerModel: "qwen2.5-coder:7b",
          verdict: "APPROVE" as const,
          reviewNotes: "All checks passed cleanly.",
          comments: [],
          diffAnalyzed: "",
          createdAt: new Date().toISOString()
        },
        merged: false,
        remediationRequired: false
      })
    } as unknown as AutomatedPrReviewLoop;

    const mockTaskRepo = {
      updateStatus: async (_id: string, status: string) => {
        updatedStatus = status;
      },
      create: async () => {}
    } as unknown as TaskRepository;

    const coordinator = new ClosedLoopPrCoordinator({
      giteaClient: mockClient,
      prWorkflow: mockWorkflow,
      reviewLoop: mockReviewLoop,
      taskRepo: mockTaskRepo
    });

    const sampleTask: TaskRecord = {
      id: "task-101",
      title: "Implement Tokenizer Stream",
      prompt: "Add async generator for tokens",
      role: "implementer",
      status: "RUNNING",
      priority: "P1",
      modelAssigned: "qwen2.5-coder:7b",
      testCommand: "npm test",
      focusFiles: null,
      targetBranch: "feat/issue-101",
      prUrl: null,
      failureCount: 0,
      createdAt: "",
      updatedAt: "",
      completedAt: null
    };

    const res = await coordinator.executeCycle({
      owner: "cacophony",
      repo: "core",
      task: sampleTask,
      worktree: { taskId: "task-101", branchName: "feat/issue-101", worktreePath: "/tmp" },
      testSummary: "Tests pass 100%",
      commitMessage: "feat: add tokenizer stream",
      reviewerModel: "deepseek-r1:8b"
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.verdict, "APPROVE");
    assert.strictEqual(res.merged, true);
    assert.strictEqual(mergedPr, true);
    assert.strictEqual(updatedStatus, "COMPLETED");
  });

  await t.test("T31.1: ClosedLoopPrCoordinator enqueues P0 remediation task on REQUEST_CHANGES", async () => {
    let createdRemediationTask: any = null;
    let taskStatusUpdated: string | undefined;

    const mockClient = {} as unknown as GiteaApiClient;
    const mockWorkflow = {
      publishPullRequest: async () => ({
        success: true,
        pullRequest: { id: 2, number: 102, html_url: "http://gitea/pulls/102" },
        branchName: "feat/issue-102"
      })
    } as unknown as AutomatedPrWorkflow;

    const mockReviewLoop = {
      evaluatePullRequest: async () => ({
        verdict: "REQUEST_CHANGES" as const,
        record: {
          id: 2,
          taskId: "task-102",
          giteaPrId: 102,
          reviewerModel: "deepseek-r1:8b",
          verdict: "REQUEST_CHANGES" as const,
          reviewNotes: "Missing null safety check on incoming buffer.",
          comments: [
            { path: "src/buffer.ts", lineNumber: 42, comment: "Guard against null pointer", severity: "blocker" as const }
          ],
          diffAnalyzed: "",
          createdAt: new Date().toISOString()
        },
        merged: false,
        remediationRequired: true
      })
    } as unknown as AutomatedPrReviewLoop;

    const mockTaskRepo = {
      updateStatus: async (_id: string, status: string) => {
        taskStatusUpdated = status;
      },
      create: async (task: any) => {
        createdRemediationTask = task;
        return task;
      }
    } as unknown as TaskRepository;

    const coordinator = new ClosedLoopPrCoordinator({
      giteaClient: mockClient,
      prWorkflow: mockWorkflow,
      reviewLoop: mockReviewLoop,
      taskRepo: mockTaskRepo
    });

    const sampleTask: TaskRecord = {
      id: "task-102",
      title: "Add raw buffer parser",
      prompt: "Parse binary buffers into tokens",
      role: "implementer",
      status: "RUNNING",
      priority: "P1",
      modelAssigned: "qwen2.5-coder:7b",
      testCommand: "npm test",
      focusFiles: "src/buffer.ts",
      targetBranch: "feat/issue-102",
      prUrl: null,
      failureCount: 0,
      createdAt: "",
      updatedAt: "",
      completedAt: null
    };

    const res = await coordinator.executeCycle({
      owner: "cacophony",
      repo: "core",
      task: sampleTask,
      worktree: { taskId: "task-102", branchName: "feat/issue-102", worktreePath: "/tmp" },
      testSummary: "Tests pass with 1 warning",
      commitMessage: "feat: add binary parser",
      reviewerModel: "deepseek-r1:8b"
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.verdict, "REQUEST_CHANGES");
    assert.strictEqual(res.remediationEnqueued, true);
    assert.ok(createdRemediationTask);
    assert.strictEqual(createdRemediationTask.priority, "P0");
    assert.ok(createdRemediationTask.prompt.includes("Missing null safety check"));
    assert.ok(createdRemediationTask.prompt.includes("src/buffer.ts:42"));
    assert.strictEqual(taskStatusUpdated, "REMEDIATING");
  });

  await t.test("T31.2: SystemToolScanner accurately identifies binaries and builds apt install command", async () => {
    // Custom executor simulating a system where btop and sensors are present, but radeontop is missing
    const customExec = async (cmd: string) => {
      if (cmd.includes("which sensors")) return { stdout: "/usr/bin/sensors\n", stderr: "" };
      if (cmd.includes("which btop")) return { stdout: "/usr/bin/btop\n", stderr: "" };
      if (cmd.includes("sensors -v")) return { stdout: "sensors version 3.6.0\n", stderr: "" };
      if (cmd.includes("btop --version")) return { stdout: "btop version: 1.3.0\n", stderr: "" };
      throw new Error(`Command failed: ${cmd}`);
    };

    const scanner = new SystemToolScanner(undefined, customExec);
    const report = await scanner.scan();

    assert.strictEqual(report.allRequiredInstalled, false);
    assert.ok(report.missingTools.length > 0);
    assert.ok(report.missingTools.some((m) => m.binaryName === "radeontop"));
    assert.ok(report.tools.some((t) => t.binaryName === "sensors" && t.installed));
    assert.ok(report.unifiedInstallCommand.includes("sudo apt update && sudo apt install -y"));
    assert.ok(report.unifiedInstallCommand.includes("radeontop"));
    assert.ok(report.missingCapabilities.length > 0);
  });
});
