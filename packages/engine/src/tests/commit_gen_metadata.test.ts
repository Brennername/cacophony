import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ConventionalCommitGenerator } from "../gitea/ConventionalCommitGenerator.js";

describe("T98.2.4: ConventionalCommitGenerator Task Metadata Trailer", () => {
  const generator = new ConventionalCommitGenerator();

  it("should append Task: <id> and Closes <id> to the commit message body", () => {
    const commit = generator.formatCommitMessage({
      role: "implementer",
      scope: "scheduler",
      description: "resolve race condition in task executor",
      taskId: "task-456",
    });

    assert.ok(commit.includes("Task: task-456"), "Must contain Task: task-456 metadata");
    assert.ok(commit.includes("Closes task-456"), "Must contain Closes task-456 trailer");
    assert.ok(commit.includes("Role: implementer"), "Must contain Role metadata");
  });

  it("should place metadata after optional custom body paragraphs", () => {
    const commit = generator.formatCommitMessage({
      role: "security_auditor",
      scope: "auth",
      description: "sanitize header tokens",
      body: "Removes bearer token leak in debug log captures.",
      taskId: "task-sec-789",
    });

    const lines = commit.split("\n\n");
    assert.strictEqual(lines[0], "fix(auth): sanitize header tokens");
    assert.strictEqual(lines[1], "Removes bearer token leak in debug log captures.");
    assert.strictEqual(lines[2], "Task: task-sec-789");
    assert.strictEqual(lines[3], "Closes task-sec-789");
    assert.strictEqual(lines[4], "Role: security_auditor");
  });
});
