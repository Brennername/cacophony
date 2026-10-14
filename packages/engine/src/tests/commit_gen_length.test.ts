import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ConventionalCommitGenerator } from "../gitea/ConventionalCommitGenerator.js";

describe("T98.2.2: ConventionalCommitGenerator Subject Length Clamping", () => {
  const generator = new ConventionalCommitGenerator();

  it("should clamp subject line to standard 72 characters when description is very long", () => {
    const longDesc =
      "this is an extremely long task description that extends well beyond seventy two characters and would normally break commit standards";
    const commit = generator.formatCommitMessage({
      role: "implementer",
      scope: "engine",
      description: longDesc,
    });

    const firstLine = commit.split("\n")[0];
    assert.ok(firstLine);
    assert.ok(
      firstLine.length <= 72,
      `Subject length (${firstLine.length}) must not exceed 72 characters: "${firstLine}"`,
    );
    assert.ok(firstLine.startsWith("feat(engine): "));
  });

  it("should not truncate subjects that are already under 72 characters", () => {
    const normalDesc = "short message";
    const commit = generator.formatCommitMessage({
      role: "chore_runner",
      scope: "docs",
      description: normalDesc,
    });

    const firstLine = commit.split("\n")[0];
    assert.strictEqual(firstLine, "chore(docs): short message");
    assert.ok(firstLine.length <= 72);
  });
});
