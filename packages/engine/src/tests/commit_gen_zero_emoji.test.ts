import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ConventionalCommitGenerator } from "../gitea/ConventionalCommitGenerator.js";

describe("T98.2.3: Zero-Emoji Policy Enforcement in Commit Generator", () => {
  const generator = new ConventionalCommitGenerator();

  it("should throw policy violation error when commit description contains emojis", () => {
    // Unicode rocket character escape
    const emojiRocket = "\u{1F680}";
    const descWithEmoji = `deploy new pipeline feature ${emojiRocket}`;

    assert.ok(generator.containsEmoji(descWithEmoji));
    assert.throws(
      () => {
        generator.formatCommitMessage({
          role: "implementer",
          scope: "pipeline",
          description: descWithEmoji,
        });
      },
      {
        message: /Zero-emoji policy violation/,
      },
    );
  });

  it("should throw policy violation error when commit scope or body contains emojis", () => {
    const emojiFire = "\u{1F525}";
    assert.throws(
      () => {
        generator.formatCommitMessage({
          role: "reviewer",
          scope: `perf-${emojiFire}`,
          description: "optimize query plan",
        });
      },
      {
        message: /Zero-emoji policy violation/,
      },
    );

    assert.throws(
      () => {
        generator.formatCommitMessage({
          role: "reviewer",
          scope: "db",
          description: "optimize query plan",
          body: `hotfix critical bottleneck ${emojiFire}`,
        });
      },
      {
        message: /Zero-emoji policy violation/,
      },
    );
  });

  it("should permit clean text without any emojis across all fields", () => {
    const commit = generator.formatCommitMessage({
      role: "test_engineer",
      scope: "engine",
      description: "add unit tests for commit generator",
      body: "Comprehensive verification of conventional commit formatting.",
      taskId: "task-test-zero-emoji",
    });

    assert.ok(commit.startsWith("test(engine): add unit tests for commit generator"));
    assert.ok(commit.includes("Closes task-test-zero-emoji"));
    assert.strictEqual(generator.containsEmoji(commit), false);
  });
});
