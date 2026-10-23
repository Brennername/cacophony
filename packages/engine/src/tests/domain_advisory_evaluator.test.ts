import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { SQLiteDriver } from "@cacophony/db";
import { MigrationRunner } from "@cacophony/db";
import { PrDiscussionRepository } from "@cacophony/db";
import { TaskRepository } from "@cacophony/db";
import { DomainAdvisoryEvaluator } from "../inference/DomainAdvisoryEvaluator.js";
import type { IGitPlatformProvider } from "../gitea/IGitPlatformProvider.js";

describe("T108.6: DomainAdvisoryEvaluator Unit Test Suite", () => {
  let driver: SQLiteDriver;
  let discussionRepo: PrDiscussionRepository;
  let taskRepo: TaskRepository;

  before(async () => {
    driver = new SQLiteDriver(":memory:");
    await driver.connect();
    const runner = new MigrationRunner(driver);
    await runner.migrate();

    discussionRepo = new PrDiscussionRepository(driver);
    taskRepo = new TaskRepository(driver);

    await taskRepo.create({
      id: "task-adv-100",
      title: "Evaluate Security and UX diffs",
      prompt: "Implement secure auth modal",
      role: "implementer",
      status: "RUNNING",
      priority: "P1",
      modelAssigned: "qwen2.5-coder:7b",
      testCommand: "npm test",
      focusFiles: "packages/frontend/src/app/modal.component.html",
      targetBranch: "task/p1-task-adv-100",
      prUrl: "http://localhost:19634/NeXeN/cacophony/pulls/12",
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    });
  });

  after(async () => {
    await driver.close();
  });

  it("should detect security, auth, and UX/UI domain concerns in code diffs", () => {
    const evaluator = new DomainAdvisoryEvaluator({
      discussionRepo,
    });

    const tips = evaluator.analyzeCodeChange({
      taskId: "task-adv-100",
      prIndex: 12,
      taskTitle: "Secure modal prompt",
      diff: `
        + const proc = child_process.spawn("git", ["status"]);
        + const token = jwt.sign(payload, secret);
        + <div class="modal-dialog overflow-auto"></div>
      `,
      focusFiles: "packages/frontend/src/app/modal.component.html",
    });

    const domains = tips.map((t) => t.domain);
    assert.ok(domains.includes("Security"));
    assert.ok(domains.includes("Authentication"));
    assert.ok(domains.includes("UX/UI"));
  });

  it("should evaluate and publish advice into PrDiscussionRepository and Gitea", async () => {
    const publishedComments: string[] = [];
    const mockGitProvider: Partial<IGitPlatformProvider> = {
      providerType: "gitea",
      createIssueComment: async (_owner, _repo, _prIndex, body) => {
        publishedComments.push(body);
      },
    };

    const evaluator = new DomainAdvisoryEvaluator({
      discussionRepo,
      gitPlatformProvider: mockGitProvider as IGitPlatformProvider,
    });

    const results = await evaluator.evaluateAndPublishAdvice({
      taskId: "task-adv-100",
      prIndex: 12,
      taskTitle: "Playwright test addition",
      diff: "+ describe('e2e test with playwright', () => {});",
      focusFiles: "tests/playwright.spec.ts",
    });

    assert.ok(results.length >= 1);
    assert.ok(results.some((r) => r.domainTag === "Playwright E2E"));

    // Verify stored in DB
    const stored = await discussionRepo.getCommentsByTaskId("task-adv-100");
    assert.ok(stored.length >= 1);

    // Verify published to mock Gitea provider
    assert.ok(publishedComments.length >= 1);
    assert.ok(publishedComments[0]!.includes("Playwright E2E"));
  });
});
