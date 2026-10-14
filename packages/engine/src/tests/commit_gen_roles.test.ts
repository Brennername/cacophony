import test from "node:test";
import assert from "node:assert/strict";
import { ConventionalCommitGenerator } from "../gitea/ConventionalCommitGenerator.js";

test("T98.2.1: ConventionalCommitGenerator Role Mapping Tests", async (t) => {
  const generator = new ConventionalCommitGenerator();

  await t.test(
    "maps implementer role to feat (and fix when isFix is true)",
    () => {
      assert.strictEqual(
        generator.resolveCommitType("implementer", false),
        "feat",
      );
      assert.strictEqual(
        generator.resolveCommitType("implementer", true),
        "fix",
      );
    },
  );

  await t.test("maps type_specialist role to feat and fix", () => {
    assert.strictEqual(
      generator.resolveCommitType("type_specialist", false),
      "feat",
    );
    assert.strictEqual(
      generator.resolveCommitType("type_specialist", true),
      "fix",
    );
  });

  await t.test("maps architect role to refactor", () => {
    assert.strictEqual(generator.resolveCommitType("architect"), "refactor");
  });

  await t.test("maps reviewer role to test", () => {
    assert.strictEqual(generator.resolveCommitType("reviewer"), "test");
  });

  await t.test("maps doc_writer role to docs", () => {
    assert.strictEqual(generator.resolveCommitType("doc_writer"), "docs");
  });
});
