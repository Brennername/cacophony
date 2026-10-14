import test from "node:test";
import assert from "node:assert/strict";
import { ConventionalCommitGenerator } from "../gitea/ConventionalCommitGenerator.js";

test("Phase 64: T64.2 Structured Conventional Commit Generator with Zero Emojis", async (t) => {
  const generator = new ConventionalCommitGenerator();

  await t.test(
    "T64.2.2: Maps task role to correct conventional commit type",
    () => {
      assert.strictEqual(generator.resolveCommitType("implementer"), "feat");
      assert.strictEqual(
        generator.resolveCommitType("implementer", true),
        "fix",
      );
      assert.strictEqual(
        generator.resolveCommitType("type_specialist"),
        "feat",
      );
      assert.strictEqual(generator.resolveCommitType("architect"), "refactor");
      assert.strictEqual(generator.resolveCommitType("reviewer"), "test");
      assert.strictEqual(generator.resolveCommitType("tester"), "test");
      assert.strictEqual(generator.resolveCommitType("doc_writer"), "docs");
      assert.strictEqual(generator.resolveCommitType("documenter"), "docs");
      assert.strictEqual(generator.resolveCommitType("unknown_role"), "chore");
      assert.strictEqual(
        generator.resolveCommitType("unknown_role", true),
        "fix",
      );
    },
  );

  await t.test(
    "T64.2.4: Formats structured commit message with task ID and role metadata",
    () => {
      const commit = generator.formatCommitMessage({
        taskId: "taskcade-t64.2.1",
        role: "implementer",
        scope: "gitea",
        description: "add ConventionalCommitGenerator utility",
        body: "Provides structured conventional commit formatting and zero-emoji verification.",
      });

      assert.ok(
        commit.startsWith(
          "feat(gitea): add ConventionalCommitGenerator utility",
        ),
        "Commit title must follow conventional commit format",
      );
      assert.ok(
        commit.includes("Task: taskcade-t64.2.1"),
        "Commit must contain Task metadata",
      );
      assert.ok(
        commit.includes("Role: implementer"),
        "Commit must contain Role metadata",
      );
      assert.ok(
        commit.includes(
          "Provides structured conventional commit formatting and zero-emoji verification.",
        ),
        "Commit must include optional body text",
      );
    },
  );

  await t.test(
    "T64.2.3: Enforces strict zero-emoji validation and throws on emojis",
    () => {
      // Valid message without emoji
      assert.doesNotThrow(() => {
        generator.formatCommitMessage({
          taskId: "task-123",
          role: "implementer",
          description: "implement new authentication flow",
        });
      });

      // Rocket emoji \u{1F680}
      assert.throws(
        () => {
          generator.formatCommitMessage({
            taskId: "task-123",
            role: "implementer",
            description: "ship feature \u{1F680}",
          });
        },
        /Zero-emoji policy violation/,
        "Should reject rocket emoji",
      );

      // Checkmark emoji \u{2705}
      assert.throws(
        () => {
          generator.formatCommitMessage({
            taskId: "task-123",
            role: "implementer",
            description: "passing tests",
            body: "all done \u{2705}",
          });
        },
        /Zero-emoji policy violation/,
        "Should reject checkmark emoji in body",
      );

      // Sparkles emoji \u{2728}
      assert.throws(
        () => {
          generator.formatCommitMessage({
            taskId: "task-123",
            role: "implementer",
            description: "sparkles \u{2728}",
          });
        },
        /Zero-emoji policy violation/,
        "Should reject sparkles emoji",
      );
    },
  );
});
