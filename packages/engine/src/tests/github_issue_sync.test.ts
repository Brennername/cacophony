import test from "node:test";
import assert from "node:assert/strict";
import { GitHubIssueSyncDaemon, type GitHubIssue } from "../gitea/GitHubIssueSyncDaemon.js";
import type { TaskRecord } from "@cacophony/shared-types";

test("GitHubIssueSyncDaemon Suite (T84.3 & T84.4)", async (t) => {
  await t.test("should parse issue into typed TaskRecord with focus files and test commands", () => {
    const daemon = new GitHubIssueSyncDaemon({
      getByTitle: async () => null,
      createIfNotExists: async (task: TaskRecord) => ({ created: true, task })
    });

    const issue: GitHubIssue = {
      number: 42,
      title: "Fix null pointer in TokenBucket limiter",
      body: [
        "The token bucket throws null pointer when redis is disconnected.",
        "",
        "Focus File: `packages/engine/src/limiter/TokenBucket.ts`",
        "Test Command: `npm test -- packages/engine/src/tests/limiter.test.ts`"
      ].join("\n"),
      labels: [{ name: "arena:auto" }],
      state: "open",
      html_url: "https://github.com/NeXeN/cacophony/issues/42"
    };

    const task = daemon.parseIssueToTask(issue);
    assert.strictEqual(task.id, "gh-issue-42");
    assert.strictEqual(task.title, "Fix null pointer in TokenBucket limiter");
    assert.strictEqual(task.focusFiles, "packages/engine/src/limiter/TokenBucket.ts");
    assert.strictEqual(task.testCommand, "npm test -- packages/engine/src/tests/limiter.test.ts");
    assert.strictEqual(task.role, "implementer");
    assert.strictEqual(task.status, "PENDING");
  });

  await t.test("should detect duplicates when issue already exists in database", async () => {
    const daemon = new GitHubIssueSyncDaemon({
      getByTitle: async (title: string) => {
        if (title.includes("Existing")) {
          return {
            id: "task-existing",
            title,
            prompt: "",
            role: "implementer",
            status: "COMPLETED",
            priority: "P1",
            modelAssigned: null,
            testCommand: null,
            focusFiles: null,
            targetBranch: "main",
            prUrl: null,
            failureCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null
          };
        }
        return null;
      },
      createIfNotExists: async (task: TaskRecord) => ({ created: true, task })
    });

    const isDupe = await daemon.isDuplicate(100, "Existing feature implementation");
    assert.strictEqual(isDupe, true);

    const isNew = await daemon.isDuplicate(101, "Brand new feature implementation");
    assert.strictEqual(isNew, false);
  });
});
