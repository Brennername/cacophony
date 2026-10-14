import test from "node:test";
import assert from "node:assert/strict";
import { AutomatedPrReviewer } from "../gitea/AutomatedPrReviewer.js";

test("Phase 64: T64.4 Automated Model Review Stage & Verdict Parser", async (t) => {
  const reviewer = new AutomatedPrReviewer();

  await t.test(
    "T64.4.2: generateReviewPrompt formats complete review instruction",
    () => {
      const diff = `--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1 +1,2 @@\n+export const version = "1.0.0";`;
      const prompt = reviewer.generateReviewPrompt(
        diff,
        "T64.4: Add Automated Reviewer",
        "Inspect diff for compliance with project standards.",
      );

      assert.ok(
        prompt.includes("T64.4: Add Automated Reviewer"),
        "Prompt must include task title",
      );
      assert.ok(
        prompt.includes("SOLID Principles"),
        "Prompt must specify SOLID standards",
      );
      assert.ok(
        prompt.includes("Zero-Emoji Compliance"),
        "Prompt must enforce zero-emoji compliance",
      );
      assert.ok(
        prompt.includes("```diff\n" + diff),
        "Prompt must include diff enclosed in diff fence",
      );
      assert.ok(
        prompt.includes("VERDICT: [APPROVE | REQUEST_CHANGES | COMMENT]"),
        "Prompt must instruct required output structure",
      );
    },
  );

  await t.test(
    "T64.4.3: parseReviewVerdict parses APPROVE verdict with summary",
    () => {
      const modelOutput = [
        "VERDICT: APPROVE",
        "SUMMARY: Code cleanly satisfies SOLID principles and contains zero emojis.",
        "FINDINGS:",
        "- [INFO] [src/index.ts:1]: Clean exported constant.",
      ].join("\n");

      const parsed = reviewer.parseReviewVerdict(modelOutput);
      assert.strictEqual(parsed.verdict, "APPROVE");
      assert.strictEqual(
        parsed.summary,
        "Code cleanly satisfies SOLID principles and contains zero emojis.",
      );
      assert.strictEqual(parsed.findings.length, 1);
      assert.strictEqual(parsed.findings[0]?.severity, "info");
      assert.strictEqual(parsed.findings[0]?.path, "src/index.ts");
      assert.strictEqual(parsed.findings[0]?.line, 1);
    },
  );

  await t.test(
    "T64.4.3: parseReviewVerdict parses REQUEST_CHANGES with blockers",
    () => {
      const modelOutput = [
        "VERDICT: REQUEST_CHANGES",
        "SUMMARY: Blockers found violating zero-emoji policy and error handling.",
        "FINDINGS:",
        "- [BLOCKER] [packages/engine/src/foo.ts:42]: Emoji symbol detected in log string.",
        "- [WARNING] [packages/engine/src/foo.ts:80]: Missing catch block for promise.",
      ].join("\n");

      const parsed = reviewer.parseReviewVerdict(modelOutput);
      assert.strictEqual(parsed.verdict, "REQUEST_CHANGES");
      assert.strictEqual(parsed.findings.length, 2);
      assert.strictEqual(parsed.findings[0]?.severity, "blocker");
      assert.strictEqual(parsed.findings[0]?.line, 42);
      assert.strictEqual(parsed.findings[1]?.severity, "warning");
    },
  );

  await t.test(
    "T64.4.3: Automatically downgrades APPROVE to REQUEST_CHANGES if blocker finding exists",
    () => {
      const modelOutput = [
        "VERDICT: APPROVE",
        "SUMMARY: Looks mostly good.",
        "FINDINGS:",
        "- [BLOCKER] [packages/engine/src/bar.ts:10]: Unhandled security vulnerability.",
      ].join("\n");

      const parsed = reviewer.parseReviewVerdict(modelOutput);
      assert.strictEqual(
        parsed.verdict,
        "REQUEST_CHANGES",
        "Blocker finding must downgrade APPROVE to REQUEST_CHANGES",
      );
    },
  );
});
